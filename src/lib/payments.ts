import { getPool } from "@/db";
import { getSessionUser } from "@/lib/auth";

// Razorpay TEST-mode checkout for the starter pack. Everything that matters is
// decided on the server: the amount, the credits, who the order belongs to and
// whether a payment is genuine. The browser only relays what Razorpay returns.
// This module refuses to run with anything but a test key (rzp_test_...), so a
// live key can never be used by accident.

export const PACK = {
  id: "starter_2",
  label: "2 extra images",
  credits: 2,
  amountPaise: 5000,
  currency: "INR",
} as const;

export type PayConfig = { keyId: string; keySecret: string; mode: "test" };

export function getPayConfig(): PayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  if (!keyId.startsWith("rzp_test_")) return null; // test mode only
  return { keyId, keySecret, mode: "test" };
}

export async function requireUser(request: Request) {
  return getSessionUser(request);
}

let schemaReady = false;
export async function ensureSchema() {
  if (schemaReady) return;
  const pool = getPool();
  await pool.query(`
    create table if not exists public.pay_orders (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      razorpay_order_id text not null unique,
      razorpay_payment_id text unique,
      pack text not null,
      credits integer not null,
      amount_paise integer not null,
      currency text not null,
      mode text not null check (mode in ('test','live')),
      status text not null default 'created' check (status in ('created','paid')),
      created_at timestamptz not null default now(),
      paid_at timestamptz
    );
    create index if not exists pay_orders_user_idx on public.pay_orders (user_id, created_at desc);
    create table if not exists public.credit_ledger (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      mode text not null check (mode in ('test','live')),
      delta integer not null,
      reason text not null,
      ref text not null unique,
      created_at timestamptz not null default now()
    );
    create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, mode);
  `);
  await pool.query(`
    create table if not exists public.free_claims (
      user_id text primary key,
      claimed_at timestamptz not null default now()
    );
  `);
  schemaReady = true;
}

export async function testCreditBalance(userId: string): Promise<number> {
  const r = (await getPool().query(
    "select coalesce(sum(delta),0)::int as n from public.credit_ledger where user_id=$1 and mode='test'",
    [userId],
  )) as { rows: Array<{ n: number }> };
  return r.rows[0]?.n ?? 0;
}

export function basicAuth(cfg: PayConfig) {
  return "Basic " + btoa(`${cfg.keyId}:${cfg.keySecret}`);
}

function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signatureValid(orderId: string, paymentId: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${orderId}|${paymentId}`)));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export async function freeAvailable(userId: string): Promise<boolean> {
  const r = (await getPool().query("select 1 from public.free_claims where user_id=$1", [userId])) as { rowCount: number | null };
  return (r.rowCount ?? 0) === 0;
}

// Spends one image from the account: the single free image first (once per
// signed-in Google account, ever), then a TEST credit. Atomic per user via an
// advisory lock. This is the hook the generation routes will call when the
// paywall is switched on; today it only records usage and generates nothing.
export async function spendOne(userId: string): Promise<{ source: "free" | "test" | "none" }> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [userId]);
    const free = await client.query("insert into public.free_claims (user_id) values ($1) on conflict do nothing returning user_id", [userId]);
    if ((free.rowCount ?? 0) > 0) { await client.query("commit"); return { source: "free" }; }
    const bal = await client.query("select coalesce(sum(delta),0)::int as n from public.credit_ledger where user_id=$1 and mode='test'", [userId]);
    if ((bal.rows[0]?.n ?? 0) <= 0) { await client.query("commit"); return { source: "none" }; }
    await client.query("insert into public.credit_ledger (user_id, mode, delta, reason, ref) values ($1,'test',-1,'test usage', $2)", [userId, `use:${crypto.randomUUID()}`]);
    await client.query("commit");
    return { source: "test" };
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
