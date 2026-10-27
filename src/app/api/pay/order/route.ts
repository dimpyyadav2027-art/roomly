import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/db";
import { basicAuth, ensureSchema, getPayConfig, PACK, requireUser } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Creates a Razorpay TEST order for the starter pack. The amount, currency and
// credits come from the server constant, never from the request body.
export async function POST(request: NextRequest) {
  const cfg = getPayConfig();
  if (!cfg) return NextResponse.json({ error: "Test checkout is not available right now." }, { status: 503 });
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to buy test credits." }, { status: 401 });

  try {
    await ensureSchema();
    const pool = getPool();
    // Reuse a recent unpaid order for the same user and pack instead of piling up orders.
    const existing = (await pool.query(
      `select razorpay_order_id from public.pay_orders
       where user_id=$1 and pack=$2 and mode='test' and status='created' and amount_paise=$3
         and created_at > now() - interval '30 minutes'
       order by created_at desc limit 1`,
      [user.id, PACK.id, PACK.amountPaise],
    )) as { rows: Array<{ razorpay_order_id: string }> };
    if (existing.rows[0]) {
      return NextResponse.json({ orderId: existing.rows[0].razorpay_order_id, keyId: cfg.keyId, amount: PACK.amountPaise, currency: PACK.currency, mode: "test" });
    }

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: basicAuth(cfg), "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: PACK.amountPaise,
        currency: PACK.currency,
        receipt: `rm_${Date.now().toString(36)}_${user.id.slice(0, 8)}`,
        notes: { user_id: user.id, pack: PACK.id, mode: "test" },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.error("Razorpay order failed", response.status, (await response.text()).slice(0, 300));
      return NextResponse.json({ error: "Could not start test checkout. Please try again." }, { status: 502 });
    }
    const order = (await response.json()) as { id?: string; amount?: number; currency?: string };
    if (!order.id || order.amount !== PACK.amountPaise || order.currency !== PACK.currency) {
      return NextResponse.json({ error: "Could not start test checkout. Please try again." }, { status: 502 });
    }
    await pool.query(
      `insert into public.pay_orders (user_id, razorpay_order_id, pack, credits, amount_paise, currency, mode)
       values ($1,$2,$3,$4,$5,$6,'test')`,
      [user.id, order.id, PACK.id, PACK.credits, PACK.amountPaise, PACK.currency],
    );
    return NextResponse.json({ orderId: order.id, keyId: cfg.keyId, amount: PACK.amountPaise, currency: PACK.currency, mode: "test" });
  } catch (error) {
    console.error("pay/order error", error);
    return NextResponse.json({ error: "Could not start test checkout. Please try again." }, { status: 500 });
  }
}
