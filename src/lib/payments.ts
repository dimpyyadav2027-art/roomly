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
  await pool.query(`
    create table if not exists public.usage_actions (
      user_id text not null,
      action_key text not null,
      source text,
      state text not null check (state in ('reserved','done','refunded')),
      calls integer not null default 0,
      ok_calls integer not null default 0,
      created_at timestamptz not null default now(),
      primary key (user_id, action_key)
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


const MAX_CALLS_PER_ACTION = 3;
const STALE_RESERVATION_MINUTES = 5; // a call that never settled (worker killed, network drop) is refunded

type Q = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> }; // eslint-disable-line @typescript-eslint/no-explicit-any

// Refunds reservations that never settled. Call while holding the user's advisory lock.
async function reapStale(client: Q, userId: string) {
  const stale = await client.query(
    `select action_key, source from public.usage_actions
     where user_id=$1 and state='reserved' and ok_calls=0 and created_at < now() - ($2 || ' minutes')::interval for update`,
    [userId, String(STALE_RESERVATION_MINUTES)],
  );
  for (const row of stale.rows as Array<{ action_key: string; source: string | null }>) {
    if (row.source === "free") await client.query("delete from public.free_claims where user_id=$1", [userId]);
    else if (row.source === "test") await client.query("insert into public.credit_ledger (user_id, mode, delta, reason, ref) values ($1,'test',1,'image refunded (unsettled)',$2)", [userId, `refund:${crypto.randomUUID()}`]);
    await client.query("update public.usage_actions set state='refunded' where user_id=$1 and action_key=$2", [userId, row.action_key]);
  }
}

export async function reapStaleFor(userId: string) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [userId]);
    await reapStale(client, userId);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

type Reserve = { ok: true; charged: boolean } | { ok: false; reason: "none" | "cap" };

// Reserves one image for a user action. One action (key) is charged once: the
// free image first (once per signed-in Google account), then a TEST credit.
// Retries with the same key are not charged again, up to a small cap. Everything
// runs under a per-user advisory lock so parallel requests cannot overspend.
export async function reserveImage(userId: string, key: string): Promise<Reserve> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [userId]);
    await reapStale(client, userId);
    const cur = await client.query("select state, calls from public.usage_actions where user_id=$1 and action_key=$2 for update", [userId, key]);
    const row = cur.rows[0] as { state: string; calls: number } | undefined;
    if (row && row.state !== "refunded") {
      if (row.calls >= MAX_CALLS_PER_ACTION) { await client.query("commit"); return { ok: false, reason: "cap" }; }
      await client.query("update public.usage_actions set calls=calls+1 where user_id=$1 and action_key=$2", [userId, key]);
      await client.query("commit");
      return { ok: true, charged: false };
    }
    let source: "free" | "test" | null = null;
    const free = await client.query("insert into public.free_claims (user_id) values ($1) on conflict do nothing returning user_id", [userId]);
    if ((free.rowCount ?? 0) > 0) source = "free";
    else {
      const bal = await client.query("select coalesce(sum(delta),0)::int as n from public.credit_ledger where user_id=$1 and mode='test'", [userId]);
      if ((bal.rows[0]?.n ?? 0) > 0) {
        await client.query("insert into public.credit_ledger (user_id, mode, delta, reason, ref) values ($1,'test',-1,'image reserved',$2)", [userId, `use:${crypto.randomUUID()}`]);
        source = "test";
      }
    }
    if (!source) { await client.query("commit"); return { ok: false, reason: "none" }; }
    await client.query(
      `insert into public.usage_actions (user_id, action_key, source, state, calls) values ($1,$2,$3,'reserved',1)
       on conflict (user_id, action_key) do update set source=$3, state='reserved', calls=public.usage_actions.calls+1`,
      [userId, key, source],
    );
    await client.query("commit");
    return { ok: true, charged: true };
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// Settles a reserved action after the generation call. Success keeps the charge.
// Failure refunds it (free image or test credit) unless an earlier call under
// the same key already succeeded.
export async function settleImage(userId: string, key: string, success: boolean): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [userId]);
    const cur = await client.query("select state, source, ok_calls from public.usage_actions where user_id=$1 and action_key=$2 for update", [userId, key]);
    const row = cur.rows[0] as { state: string; source: string | null; ok_calls: number } | undefined;
    if (row) {
      if (success) {
        await client.query("update public.usage_actions set ok_calls=ok_calls+1, state='done' where user_id=$1 and action_key=$2", [userId, key]);
      } else if (row.state === "reserved" && row.ok_calls === 0) {
        if (row.source === "free") await client.query("delete from public.free_claims where user_id=$1", [userId]);
        else if (row.source === "test") await client.query("insert into public.credit_ledger (user_id, mode, delta, reason, ref) values ($1,'test',1,'image refunded',$2)", [userId, `refund:${crypto.randomUUID()}`]);
        await client.query("update public.usage_actions set state='refunded' where user_id=$1 and action_key=$2", [userId, key]);
      }
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// Wraps a generation route: sign-in required, one image reserved before the
// call, refunded if the call fails. Test mode only; with no test key the
// wrapper does nothing and the route behaves as before.
export async function metered(request: Request, handler: (r: Request) => Promise<Response>): Promise<Response> {
  if (!getPayConfig()) return handler(request);
  const user = await requireUser(request);
  if (!user) return Response.json({ error: "Sign in with Google to use your free image.", needSignIn: true }, { status: 401 });
  const header = request.headers.get("x-roomly-action") ?? "";
  const key = /^[A-Za-z0-9-]{8,64}$/.test(header) ? header : crypto.randomUUID();
  let reserved: Reserve;
  try {
    await ensureSchema();
    reserved = await reserveImage(user.id, key);
  } catch (e) {
    console.error("reserve failed", e);
    return Response.json({ error: "Could not check your images right now. Please try again." }, { status: 503 });
  }
  if (!reserved.ok) {
    return Response.json(
      reserved.reason === "cap"
        ? { error: "Too many tries for this edit." }
        : { error: "You have used your free image. Buy the test pack in Credits (test) to continue.", needCredits: true },
      { status: reserved.reason === "cap" ? 429 : 402 },
    );
  }
  let res: Response;
  try {
    res = await handler(request.clone());
  } catch (e) {
    await settleImage(user.id, key, false).catch(() => {});
    throw e;
  }
  await settleImage(user.id, key, res.ok).catch((e) => console.error("settle failed", e));
  return res;
}
