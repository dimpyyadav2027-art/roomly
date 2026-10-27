import { NextRequest, NextResponse } from "next/server";
import { metered } from "@/lib/payments";
import { getPool, hasHyperdrive } from "@/db";

// AI restyle (beta): sends the visitor's photo - only after their explicit
// consent in the UI - to Cloudflare Workers AI (FLUX.2 klein 4b) for a full
// restyle. Roomly stores nothing: the input photo and the AI result live only
// for the duration of the request. Cloudflare's policy: inputs/outputs are not
// used for training and are not retained after delivering the response, except
// where legally required; operational metadata (sizes, times, counts) is kept.

const DAILY_NEURON_BUDGET = 8400; // safety margin below the 10,000/day free allocation
const RESERVE_NEURONS = 120; // measured 104.2 at 1024x1024; small margin
const MAX_IMAGE_CHARS = 6 * 1024 * 1024; // ~4.5MB binary as base64 data URL

const THEMES: Record<string, string> = {
  "Warm minimal": "warm minimal style with soft cream walls, natural textures, cozy cushions and warm soft lighting",
  "Earthy retreat": "earthy retreat style with olive and terracotta tones, natural wood, linen fabrics and potted plants",
  "Coastal calm": "coastal calm style with soft blue-grey and white tones, light airy fabrics and relaxed natural light",
  "Modern Indian": "modern Indian style with warm rust and brass accents, textured fabrics, handcrafted decor and warm lighting",
};
const ROOM_TYPES = ["Rented apartment", "PG / shared room", "Own house", "Boutique hotel"];

// Best-effort per-IP rate limit (in-memory per serverless instance): 10 requests/hour.
const hits = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

// Durable global daily budget, shared by all visitors: one row per UTC day in
// Supabase Postgres. The conflicting upsert takes a row lock, so concurrent
// requests cannot both pass. Returns remaining capacity or null when exhausted.
async function reserveDailyNeurons(cost: number): Promise<boolean> {
  const result = (await getPool().query(
    `insert into global_daily_neurons (day, neurons) values (current_date, $1)
     on conflict (day) do update set neurons = global_daily_neurons.neurons + $1
     where global_daily_neurons.neurons + $1 <= $2
     returning neurons`,
    [cost, DAILY_NEURON_BUDGET],
  )) as { rowCount: number | null };
  return (result.rowCount ?? 0) > 0;
}

// Reconcile the reservation with the neurons Cloudflare actually billed.
async function reconcileDailyNeurons(delta: number): Promise<void> {
  if (!delta) return;
  await getPool().query(
    `insert into global_daily_neurons (day, neurons) values (current_date, $1)
     on conflict (day) do update set neurons = greatest(0, global_daily_neurons.neurons + $1)`,
    [delta],
  );
}

// Read-only readiness check used by the UI. It reveals only whether the feature
// is configured, never credentials or database details.
export async function GET() {
  const configured = Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_API_TOKEN &&
    (process.env.DATABASE_URL || hasHyperdrive()),
  );
  if (!configured) {
    return NextResponse.json({ enabled: false, reason: "not_configured" });
  }

  try {
    const result = await getPool().query(
      "select to_regclass('public.global_daily_neurons') as table_name",
    ) as { rows: Array<{ table_name: string | null }> };
    const budgetTableReady = Boolean(result.rows[0]?.table_name);
    return NextResponse.json({
      enabled: budgetTableReady,
      reason: budgetTableReady ? "ready" : "budget_table_missing",
    });
  } catch {
    return NextResponse.json({ enabled: false, reason: "unavailable" });
  }
}

async function handlePost(request: NextRequest) {
  let body: { image?: unknown; theme?: unknown; roomType?: unknown; consent?: unknown; width?: unknown; height?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request must be valid JSON." }, { status: 400 });
  }

  if (body.consent !== true) {
    return NextResponse.json({ error: "The AI restyle needs your explicit OK before the photo leaves this device." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many AI restyles from this connection. Please try again later." }, { status: 429 });
  }

  const theme = typeof body.theme === "string" && THEMES[body.theme] ? body.theme : "Warm minimal";
  const roomType = typeof body.roomType === "string" && ROOM_TYPES.includes(body.roomType) ? body.roomType : "Rented apartment";
  const image = typeof body.image === "string" && body.image.startsWith("data:image/") ? body.image : undefined;
  if (!image || image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "Please use a room photo under 4 MB for the AI restyle." }, { status: 413 });
  }
  // Client reports the downscaled pixel dimensions it produced; without them
  // the model defaults to a square output, changing the room's geometry.
  const width = typeof body.width === "number" && Number.isInteger(body.width) && body.width >= 256 && body.width <= 2048 ? body.width : undefined;
  const height = typeof body.height === "number" && Number.isInteger(body.height) && body.height >= 256 && body.height <= 2048 ? body.height : undefined;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;
  if (!accountId || !apiToken || !databaseUrl) {
    // Fail closed: without the durable daily budget the free allocation cannot
    // be guarded, so the feature stays off rather than running uncapped.
    return NextResponse.json({ error: "AI restyle is not enabled right now. Please try the style plan instead." }, { status: 503 });
  }

  try {
    const reserved = await reserveDailyNeurons(RESERVE_NEURONS);
    if (!reserved) {
      return NextResponse.json({
        error: "Today's free AI restyles are used up. The style plan still works, and the AI restyle resets tomorrow.",
        exhausted: true,
      }, { status: 429 });
    }
  } catch (error) {
    console.error("Daily budget check failed", error);
    return NextResponse.json({ error: "AI restyle is unavailable right now - please try again later." }, { status: 503 });
  }

  const base64 = image.slice(image.indexOf(",") + 1);
  const bytes = Buffer.from(base64, "base64");
  const mime = image.slice(5, image.indexOf(";"));
  const prompt = [
    `Keep this exact room unchanged: same window, doors, walls, floor, ceiling, furniture positions and camera angle.`,
    `Only restyle the decor into a ${THEMES[theme]} for a ${roomType.toLowerCase()}.`,
    `Add soft decor only: cushions, plants, lamps, abstract wall art (no photographs of people), rugs.`,
    `Do not move, remove, or replace any furniture or architectural features. Do not change the camera angle.`,
  ].join(" ");

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("image", new Blob([bytes], { type: mime }), "room-photo");
  if (width && height) {
    form.append("width", String(width));
    form.append("height", String(height));
  }

  let billed = RESERVE_NEURONS;
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}` },
        body: form,
        signal: AbortSignal.timeout(90_000),
      },
    );
    const headerNeurons = Number(response.headers.get("cf-ai-neurons"));
    if (Number.isFinite(headerNeurons) && headerNeurons > 0) billed = headerNeurons;

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error("Workers AI restyle failed", response.status, detail);
      await reconcileDailyNeurons(-RESERVE_NEURONS).catch(() => {});
      const exhausted = response.status === 429;
      return NextResponse.json({
        error: exhausted
          ? "Today's free AI restyles are used up. The style plan still works, and the AI restyle resets tomorrow."
          : "The AI restyle did not work this time. Please try again in a moment.",
        exhausted,
      }, { status: exhausted ? 429 : 502 });
    }

    const result = (await response.json()) as { result?: { image?: string } };
    const out = result.result?.image;
    if (!out) {
      await reconcileDailyNeurons(-RESERVE_NEURONS).catch(() => {});
      return NextResponse.json({ error: "The AI restyle returned no image. Please try again." }, { status: 502 });
    }

    if (billed !== RESERVE_NEURONS) {
      await reconcileDailyNeurons(Math.round(billed - RESERVE_NEURONS)).catch(() => {});
    }
    // The result goes straight back to the visitor's browser; it is not saved anywhere.
    return NextResponse.json({ image: `data:image/jpeg;base64,${out}` });
  } catch (error) {
    console.error("Workers AI restyle error", error);
    await reconcileDailyNeurons(-RESERVE_NEURONS).catch(() => {});
    return NextResponse.json({ error: "The AI restyle did not work this time. Please try again in a moment." }, { status: 502 });
  }
}


// Each successful image uses one of the signed-in user's images (1 free per Google account, then test credits).
export async function POST(request: NextRequest) {
  return metered(request, (r) => handlePost(r as NextRequest));
}
