import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Lazy singleton: only connects (and only requires DATABASE_URL) when a route
// actually touches the database, so demo mode and `next build` work without it.
const globalForDb = globalThis as typeof globalThis & {
  __roomlyPool?: Pool;
};

export function hasDatabase() {
  // Persistence is opt-in per deployment. The public demo runs fully
  // stateless: no database rows and no photo uploads, even if database
  // env vars are present. Set ENABLE_PERSISTENCE=true (with proper auth)
  // to turn storage back on.
  return process.env.ENABLE_PERSISTENCE === "true" && Boolean(process.env.DATABASE_URL);
}

// On Cloudflare Workers the database is reached through a Hyperdrive binding
// (it handles TLS and pooling). Workers cannot share sockets across requests,
// so each call gets its own short-lived single-connection Pool.
function hyperdriveUrl(): string | undefined {
  try {
    const env = getCloudflareContext().env as { HYPERDRIVE?: { connectionString?: string } };
    return env.HYPERDRIVE?.connectionString;
  } catch {
    return undefined;
  }
}

export function getPool(): Pool {
  const viaHyperdrive = hyperdriveUrl();
  if (viaHyperdrive) {
    return new Pool({ connectionString: viaHyperdrive, max: 1, maxUses: 1 });
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database-backed features");
  }
  if (!globalForDb.__roomlyPool) {
    // The Supabase connection pooler presents a certificate chain whose CA is
    // not in public trust stores (Supabase-issued). Connect with TLS but
    // without chain verification for that host, matching Supabase's own
    // documented pooler guidance. The ledger data is non-sensitive.
    const pooler = databaseUrl.includes("pooler.supabase.com");
    globalForDb.__roomlyPool = new Pool({
      connectionString: databaseUrl,
      ssl: pooler ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForDb.__roomlyPool;
}

export function getDb() {
  return drizzle(getPool());
}

export function hasHyperdrive() {
  return Boolean(hyperdriveUrl());
}
