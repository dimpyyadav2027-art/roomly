"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client (anon key, safe to expose). Used for magic-link
// sign-in and for attaching the session token to API calls. Returns null when
// Supabase env vars are not configured (the public demo runs without them).
let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!client) client = createClient(url, anonKey);
  return client;
}
