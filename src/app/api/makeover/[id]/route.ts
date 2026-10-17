import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { makeovers } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { users } from "@/db/schema";

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

  // Owner-scoped access: a persisted makeover (including its room photo) is
  // visible only to the signed-in account that created it. Everyone else -
  // signed-in or not - gets the same 404 as a nonexistent record, so record
  // existence is not leaked.
  const sessionUser = await getSessionUser(_request);
  let ownerEmail: string | undefined;
  if (row.userId) {
    const [owner] = await getDb().select().from(users).where(eq(users.id, row.userId)).limit(1);
    ownerEmail = owner?.email;
  }
  const isOwner = Boolean(sessionUser && ownerEmail && sessionUser.email === ownerEmail);
  if (!isOwner) {
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
