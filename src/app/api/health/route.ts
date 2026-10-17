import { getDb, hasDatabase } from "@/db";
import { hasSupabase } from "@/lib/supabase";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, boolean> = {
    databaseConfigured: hasDatabase(),
    supabaseStorageConfigured: hasSupabase(),
    replicateConfigured: Boolean(process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_MODEL),
  };
  if (hasDatabase()) {
    try {
      await getDb().execute(sql`select 1`);
      checks.databaseReachable = true;
    } catch {
      checks.databaseReachable = false;
    }
  }
  return Response.json({ ok: true, checks });
}
