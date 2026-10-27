import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, freeAvailable, getPayConfig, requireUser, spendOne, testCreditBalance } from "@/lib/payments";

export const dynamic = "force-dynamic";

// TEST-ONLY usage simulation: spends the account's free image, then test
// credits. It does not generate or call any AI model.
export async function POST(request: NextRequest) {
  if (!getPayConfig()) return NextResponse.json({ error: "Not available right now." }, { status: 503 });
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    await ensureSchema();
    const { source } = await spendOne(user.id);
    return NextResponse.json({ source, testCredits: await testCreditBalance(user.id), freeAvailable: await freeAvailable(user.id) });
  } catch (error) {
    console.error("credits/use error", error);
    return NextResponse.json({ error: "Could not record that right now." }, { status: 500 });
  }
}
