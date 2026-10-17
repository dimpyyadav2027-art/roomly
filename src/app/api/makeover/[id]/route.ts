import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { makeovers } from "@/db/schema";

export const dynamic = "force-dynamic";

// Poll one makeover's status. When a Replicate prediction is still running and
// a token is configured, this also refreshes its state from Replicate.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }
  const { id } = await params;

  const [row] = await getDb().select().from(makeovers).where(eq(makeovers.id, id)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "Makeover not found." }, { status: 404 });
  }

  if (row.predictionId && row.status === "processing" && process.env.REPLICATE_API_TOKEN) {
    try {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${row.predictionId}`, {
        headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
      });
      const prediction = (await response.json()) as { status?: string; output?: unknown; error?: unknown };
      if (response.ok && prediction.status && prediction.status !== row.status) {
        const outputUrl = Array.isArray(prediction.output)
          ? String(prediction.output[0] ?? "")
          : typeof prediction.output === "string"
            ? prediction.output
            : undefined;
        const status = prediction.status === "succeeded" ? "succeeded" : prediction.status === "failed" || prediction.status === "canceled" ? "failed" : "processing";
        await getDb().update(makeovers).set({
          status,
          outputImageUrl: outputUrl || row.outputImageUrl,
          error: prediction.error ? String(prediction.error) : null,
          updatedAt: new Date(),
        }).where(eq(makeovers.id, id));
        row.status = status;
        row.outputImageUrl = outputUrl || row.outputImageUrl;
      }
    } catch (error) {
      console.error("Could not refresh prediction", error);
    }
  }

  return NextResponse.json({
    id: row.id,
    status: row.status,
    tier: row.tier,
    theme: row.theme,
    roomType: row.roomType,
    budget: row.budget,
    inputImageUrl: row.inputImageUrl,
    outputImageUrl: row.outputImageUrl,
    createdAt: row.createdAt,
  });
}
