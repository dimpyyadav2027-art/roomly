import { NextRequest, NextResponse } from "next/server";
import { metered } from "@/lib/payments";
import { getPool } from "@/db";

// Tap-to-add edits: the visitor taps a spot on their photo and picks an item
// (plant, wall art, vase, cushion). The browser crops a 768px region around
// the tap, and only that crop plus a soft mask goes to Cloudflare Workers AI
// (Stable Diffusion 1.5 inpainting) after explicit consent. Roomly stores
// nothing: crop, mask and result live only for the duration of the request.
// The browser pastes the edited region back, so everything outside the masked
// spot stays pixel-identical to the original photo.

const DAILY_CALL_BUDGET = 250; // shared across all visitors; bounds abuse even at 0 neurons
const MAX_CROP_CHARS = 8 * 1024 * 1024; // 768x768 PNG as data URL
const MODEL = "@cf/runwayml/stable-diffusion-v1-5-inpainting";

const ITEMS: Record<string, { prompt: string }> = {
  plant: { prompt: "a large potted monstera plant in a woven basket standing on the floor, soft shadow cast on the floor, natural window light, photorealistic" },
  art: { prompt: "a large framed botanical art print hanging flat on the wall, centered in frame, realistic, soft natural light" },
  vase: { prompt: "a small ceramic vase with fresh flowers standing on the table, soft shadow on the surface, photorealistic" },
  cushion: { prompt: "a plump decorative throw pillow sitting on the sofa seat, realistic fabric, natural daylight" },
};
const NEGATIVE = "blurry, cartoon, distorted, deformed, extra objects, text, watermark";

// Best-effort per-IP rate limit (in-memory per serverless instance): 30/hour.
const hits = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 30;
}

// Durable global daily counter, shared by all visitors: one row per UTC day.
async function reserveDailyCall(): Promise<boolean> {
  const result = (await getPool().query(
    `insert into global_daily_add_edits (day, calls) values (current_date, 1)
     on conflict (day) do update set calls = global_daily_add_edits.calls + 1
     where global_daily_add_edits.calls + 1 <= $1
     returning calls`,
    [DAILY_CALL_BUDGET],
  )) as { rowCount: number | null };
  return (result.rowCount ?? 0) > 0;
}

async function handlePost(request: NextRequest) {
  let body: { crop?: unknown; mask?: unknown; item?: unknown; seed?: unknown; consent?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request must be valid JSON." }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "AI edits need your explicit OK before any part of the photo leaves this device." }, { status: 400 });
  }
  const item = typeof body.item === "string" ? ITEMS[body.item] : undefined;
  if (!item) {
    return NextResponse.json({ error: "Unknown item." }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many AI edits from this connection. Please try again later." }, { status: 429 });
  }
  const crop = typeof body.crop === "string" && body.crop.startsWith("data:image/png") ? body.crop : undefined;
  const mask = typeof body.mask === "string" && body.mask.startsWith("data:image/png") ? body.mask : undefined;
  if (!crop || !mask || crop.length > MAX_CROP_CHARS || mask.length > MAX_CROP_CHARS) {
    return NextResponse.json({ error: "The edit region is missing or too large." }, { status: 413 });
  }
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;
  if (!accountId || !apiToken || !databaseUrl) {
    return NextResponse.json({ error: "AI edits are not enabled right now." }, { status: 503 });
  }
  try {
    const reserved = await reserveDailyCall();
    if (!reserved) {
      return NextResponse.json({ error: "Today's free AI edits are used up. Please try again tomorrow.", exhausted: true }, { status: 429 });
    }
  } catch (error) {
    console.error("Daily edit counter failed", error);
    return NextResponse.json({ error: "AI edits are unavailable right now - please try again later." }, { status: 503 });
  }

  const cropB64 = crop.slice(crop.indexOf(",") + 1);
  const maskBytes = Array.from(Buffer.from(mask.slice(mask.indexOf(",") + 1), "base64"));
  const seed = typeof body.seed === "number" && Number.isInteger(body.seed) && body.seed >= 0 && body.seed < 1e9 ? body.seed : Math.floor(Math.random() * 1e9);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: item.prompt,
          negative_prompt: NEGATIVE,
          num_steps: 20,
          guidance: 13,
          width: 768,
          height: 768,
          seed,
          image_b64: cropB64,
          mask: maskBytes,
        }),
        signal: AbortSignal.timeout(90_000),
      },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error("Workers AI add-edit failed", response.status, detail);
      const exhausted = response.status === 429;
      return NextResponse.json({
        error: exhausted ? "Today's free AI edits are used up. Please try again tomorrow." : "The edit did not work this time. Please try again in a moment.",
        exhausted,
      }, { status: exhausted ? 429 : 502 });
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return NextResponse.json({ image: `data:image/png;base64,${bytes.toString("base64")}`, seed });
  } catch (error) {
    console.error("Workers AI add-edit error", error);
    return NextResponse.json({ error: "The edit did not work this time. Please try again in a moment." }, { status: 502 });
  }
}


// Each successful image uses one of the signed-in user's images (1 free per Google account, then test credits).
export async function POST(request: NextRequest) {
  return metered(request, (r) => handlePost(r as NextRequest));
}
