import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client (service role) for storage uploads.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
const globalForSupabase = globalThis as typeof globalThis & {
  __roomlySupabaseAdmin?: SupabaseClient;
};

export function hasSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase URL and service role key are required for storage features");
  }
  if (!globalForSupabase.__roomlySupabaseAdmin) {
    globalForSupabase.__roomlySupabaseAdmin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return globalForSupabase.__roomlySupabaseAdmin;
}

export const ROOM_PHOTOS_BUCKET = "room-photos";

// Uploads a data-URL room photo to private Supabase Storage and returns a
// 7-day signed URL. Returns null when Supabase is not configured.
export async function uploadRoomPhoto(dataUrl: string, makeoverId: string): Promise<string | null> {
  if (!hasSupabase()) return null;
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const bytes = Buffer.from(match[2], "base64");
  const supabase = getSupabaseAdmin();
  const path = `${makeoverId}/input.${ext}`;
  const { error } = await supabase.storage.from(ROOM_PHOTOS_BUCKET).upload(path, bytes, {
    contentType: `image/${match[1] === "jpg" ? "jpeg" : match[1]}`,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = await supabase.storage.from(ROOM_PHOTOS_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}
