-- Run after `npx drizzle-kit push` (Supabase SQL editor or psql).
-- All client-side (anon key) access to app tables is denied by default.
-- Every server API route uses the service-role key, which bypasses RLS,
-- so the app keeps working while the public Data API stays closed.

alter table public.users enable row level security;
alter table public.makeovers enable row level security;

-- No policies are created: with RLS enabled and no permissive policy,
-- anon/authenticated roles can read or write nothing. Server code only.

-- The room-photos storage bucket must be PRIVATE (dashboard setting);
-- photos are served through short-lived signed URLs created server-side.
