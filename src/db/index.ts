import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Lazy singleton: only connects (and only requires DATABASE_URL) when a route
// actually touches the database, so demo mode and `next build` work without it.
const globalForDb = globalThis as typeof globalThis & {
  __roomlyPool?: Pool;
};

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database-backed features");
  }
  if (!globalForDb.__roomlyPool) {
    globalForDb.__roomlyPool = new Pool({ connectionString: databaseUrl });
  }
  return globalForDb.__roomlyPool;
}

export function getDb() {
  return drizzle(getPool());
}
