-- Run once in the Supabase SQL Editor to enable the optional AI restyle beta.
-- The application server uses DATABASE_URL to read/write this table; never expose
-- database credentials to the browser. This ledger stores only daily usage counts.
create table if not exists public.global_daily_neurons (
  day date primary key default current_date,
  neurons integer not null default 0 check (neurons >= 0)
);

-- No browser-facing RLS policy is needed: this table is accessed only by the
-- server-side Postgres connection, not through the Supabase browser client.
