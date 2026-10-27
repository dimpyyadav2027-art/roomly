import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/db";
import { basicAuth, ensureSchema, getPayConfig, PACK, requireUser, signatureValid, testCreditBalance } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Verifies a Razorpay TEST payment and grants TEST credits exactly once.
// Checks: signed-in owner of the order, HMAC signature, and the payment's own
// record at Razorpay (same order, right amount, captured/authorized). Granting
// is idempotent: the order flips to paid once and the ledger ref is unique.
export async function POST(request: NextRequest) {
  const cfg = getPayConfig();
  if (!cfg) return NextResponse.json({ error: "Test checkout is not available right now." }, { status: 503 });
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let body: { razorpay_order_id?: unknown; razorpay_payment_id?: unknown; razorpay_signature?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  if (!/^order_\w+$/.test(orderId) || !/^pay_\w+$/.test(paymentId) || !/^[0-9a-f]{64}$/.test(signature)) {
    return NextResponse.json({ error: "Invalid payment details." }, { status: 400 });
  }

  try {
    await ensureSchema();
    const pool = getPool();
    const found = (await pool.query(
      "select id, credits, amount_paise, status, razorpay_payment_id from public.pay_orders where razorpay_order_id=$1 and user_id=$2 and mode='test'",
      [orderId, user.id],
    )) as { rows: Array<{ id: string; credits: number; amount_paise: number; status: string; razorpay_payment_id: string | null }> };
    const order = found.rows[0];
    if (!order) return NextResponse.json({ error: "Order not found for this account." }, { status: 404 });

    if (order.status === "paid") {
      // Replay of an already-settled order: report state, grant nothing more.
      return NextResponse.json({ ok: true, alreadyApplied: order.razorpay_payment_id === paymentId, testCredits: await testCreditBalance(user.id), mode: "test" });
    }
    if (!(await signatureValid(orderId, paymentId, signature, cfg.keySecret))) {
      return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
    }
    const pr = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: basicAuth(cfg) },
      signal: AbortSignal.timeout(20_000),
    });
    if (!pr.ok) return NextResponse.json({ error: "Payment could not be confirmed yet. Please try again." }, { status: 502 });
    const pay = (await pr.json()) as { order_id?: string; amount?: number; currency?: string; status?: string };
    const okStatus = pay.status === "captured" || pay.status === "authorized";
    if (pay.order_id !== orderId || pay.amount !== order.amount_paise || pay.currency !== PACK.currency || !okStatus) {
      return NextResponse.json({ error: "Payment could not be confirmed." }, { status: 400 });
    }

    // Single statement: flip created->paid once, and only then write the ledger row.
    await pool.query(
      `with paid as (
         update public.pay_orders set status='paid', razorpay_payment_id=$3, paid_at=now()
         where id=$1 and user_id=$2 and status='created' returning id, credits
       )
       insert into public.credit_ledger (user_id, mode, delta, reason, ref)
       select $2, 'test', credits, 'test pack purchase', 'order:' || $4 from paid
       on conflict (ref) do nothing`,
      [order.id, user.id, paymentId, orderId],
    );
    return NextResponse.json({ ok: true, testCredits: await testCreditBalance(user.id), mode: "test" });
  } catch (error) {
    console.error("pay/verify error", error);
    return NextResponse.json({ error: "Could not confirm payment. If you were charged in test mode, retry in a moment." }, { status: 500 });
  }
}
