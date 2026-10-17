import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { makeovers } from "@/db/schema";
import { uploadRoomPhoto } from "@/lib/supabase";

type MakeoverRequest = {
  prompt?: unknown;
  budget?: unknown;
  tier?: unknown;
  roomType?: unknown;
  image?: unknown;
};

function text(value: unknown, fallback: string, maxLength = 140) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

export async function POST(request: NextRequest) {
  let body: MakeoverRequest;

  try {
    body = (await request.json()) as MakeoverRequest;
  } catch {
    return NextResponse.json({ error: "The makeover request must be valid JSON." }, { status: 400 });
  }

  const theme = text(body.prompt, "warm minimal");
  const roomType = text(body.roomType, "rented apartment");
  const tier = body.tier === "PAID_150" ? "PAID_150" : "FREE";
  const budget = typeof body.budget === "number" && Number.isFinite(body.budget)
    ? Math.min(Math.max(Math.round(body.budget), 2000), 10000)
    : 6000;
  const image = typeof body.image === "string" && body.image.startsWith("data:image/")
    ? body.image
    : undefined;

  const resolution = tier === "PAID_150" ? "1080p HD" : "720p";
  const prompt = [
    `Photorealistic ${theme} interior makeover for a ${roomType}.`,
    "Preserve the original room geometry exactly: walls, windows, doors, ceiling, camera perspective, and key furniture placement.",
    `Add attainable decor only, with a total styling budget near INR ${budget}.`,
    `Use natural interior lighting, realistic scale, and highly detailed material textures. Render at ${resolution}.`,
  ].join(" ");

  // Persist the makeover request when a database is configured (Supabase
  // Postgres). The demo still works without one.
  let makeoverId: string | undefined;
  if (hasDatabase()) {
    try {
      const [row] = await getDb()
        .insert(makeovers)
        .values({ roomType, theme, budget, tier, prompt, status: "queued" })
        .returning({ id: makeovers.id });
      makeoverId = row.id;
      if (image) {
        const inputImageUrl = await uploadRoomPhoto(image, makeoverId);
        if (inputImageUrl) {
          await getDb().update(makeovers).set({ inputImageUrl }).where(eq(makeovers.id, makeoverId));
        }
      }
    } catch (error) {
      console.error("Could not persist makeover request", error);
      // Keep serving the demo instead of failing the whole request.
    }
  }

  const token = process.env.REPLICATE_API_TOKEN;
  const model = process.env.REPLICATE_MODEL;

  if (!token || !model) {
    if (makeoverId && hasDatabase()) {
      try {
        await getDb().update(makeovers).set({ status: "demo", updatedAt: new Date() }).where(eq(makeovers.id, makeoverId));
      } catch {}
    }
    return NextResponse.json({
      configured: false,
      mode: "demo",
      makeoverId,
      message: "Add REPLICATE_API_TOKEN and REPLICATE_MODEL to enable live generation.",
    });
  }

  if (!image) {
    return NextResponse.json(
      { error: "Please upload a room photo before starting a live prediction.", makeoverId },
      { status: 400 },
    );
  }

  // Configure REPLICATE_MODEL as an image-to-image / ControlNet model whose input
  // accepts these common keys. For models with different field names, adapt this
  // object in one place rather than exposing the API token to the browser.
  const input = {
    image,
    prompt,
    negative_prompt: "warped walls, extra windows, distorted furniture, impossible architecture, text, watermark",
    num_outputs: 1,
    output_format: "webp",
    guidance_scale: tier === "PAID_150" ? 7.5 : 6.5,
    num_inference_steps: tier === "PAID_150" ? 34 : 24,
  };

  try {
    const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
        "Cancel-After": "2m",
      },
      body: JSON.stringify({ input }),
    });

    const prediction = (await response.json()) as {
      id?: string;
      status?: string;
      output?: unknown;
      detail?: string;
      title?: string;
    };

    if (!response.ok) {
      console.error("Replicate prediction request failed", response.status, prediction.detail ?? prediction.title);
      if (makeoverId && hasDatabase()) {
        try {
          await getDb().update(makeovers).set({ status: "failed", error: prediction.detail ?? prediction.title ?? "rejected", updatedAt: new Date() }).where(eq(makeovers.id, makeoverId));
        } catch {}
      }
      return NextResponse.json(
        { configured: true, accepted: false, makeoverId, message: "Replicate rejected this model input. Check your model input mapping." },
        { status: 502 },
      );
    }

    const outputUrl = Array.isArray(prediction.output) ? String(prediction.output[0] ?? "") : typeof prediction.output === "string" ? prediction.output : undefined;
    if (makeoverId && hasDatabase()) {
      try {
        await getDb().update(makeovers).set({
          status: prediction.status === "succeeded" ? "succeeded" : "processing",
          predictionId: prediction.id,
          outputImageUrl: outputUrl || undefined,
          updatedAt: new Date(),
        }).where(eq(makeovers.id, makeoverId));
      } catch {}
    }

    return NextResponse.json({
      configured: true,
      accepted: true,
      makeoverId,
      predictionId: prediction.id,
      status: prediction.status,
      output: prediction.output,
    });
  } catch (error) {
    console.error("Replicate request could not be completed", error);
    return NextResponse.json(
      { configured: true, accepted: false, makeoverId, message: "Replicate could not be reached. Please try again." },
      { status: 502 },
    );
  }
}
