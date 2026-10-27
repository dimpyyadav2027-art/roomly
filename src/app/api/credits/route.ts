import { NextRequest, NextResponse } from "next/server";
import { reapStaleFor, freeAvailable, ensureSchema, getPayConfig, PACK, requireUser, testCreditBalance } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cfg = getPayConfig();
  const pack = { id: PACK.id, credits: PACK.credits, amountRupees: PACK.amountPaise / 100 };
  if (!cfg) return NextResponse.json({ enabled: false, pack });
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ enabled: true, mode: "test", signedIn: false, pack });
  try {
    await ensureSchema();
    await reapStaleFor(user.id);
    return NextResponse.json({ enabled: true, mode: "test", signedIn: true, testCredits: await testCreditBalance(user.id), freeAvailable: await freeAvailable(user.id), pack });
  } catch (error) {
    console.error("credits read failed", error);
    return NextResponse.json({ enabled: false, pack });
  }
}
