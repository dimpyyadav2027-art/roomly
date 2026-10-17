import { createClient } from "@supabase/supabase-js";

// Resolves the signed-in user from a Supabase Auth access token, sent either
// as an Authorization: Bearer header or the sb-access-token cookie set by the
// browser after magic-link sign-in. Returns null when there is no valid
// session. Only used when persistence is enabled; the public demo never calls
// this.
export async function getSessionUser(request: Request): Promise<{ id: string; email?: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const header = request.headers.get("authorization");
  let token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    const cookie = request.headers.get("cookie") ?? "";
    const match = cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
    token = match ? decodeURIComponent(match[1]) : undefined;
  }
  if (!token) return null;

  try {
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? undefined };
  } catch {
    return null;
  }
}
