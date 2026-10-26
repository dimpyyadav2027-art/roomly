# Roomly

AI room-makeover studio: upload a room photo, pick a style and budget, and get a
structure-aware redesign with shoppable pieces.

## Stack

- **Frontend + API:** Next.js (App Router), React, Tailwind CSS
- **Database:** Supabase Postgres via Drizzle ORM (`makeovers`, `users` tables)
- **File storage:** Supabase Storage (private `room-photos` bucket, signed URLs)
- **AI generation:** Cloudflare Workers AI FLUX.2 klein 4b for the optional image-restyle beta (server-side credentials required)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

Without provider credentials, the AI restyle is clearly marked unavailable and the local style planner still works. Room photos stay in the browser unless the user explicitly consents to AI processing.

## Supabase setup (one time)

1. Create a free project at https://supabase.com (sign in with GitHub).
2. Project Settings -> Database -> copy the **Transaction pooler** connection
   string (port 6543) into `DATABASE_URL`.
3. Project Settings -> API -> copy the project URL, anon key and service-role
   key into the env vars. The service-role key is server-only; never expose it.
4. Push the schema:
   ```bash
   npx drizzle-kit push
   ```
5. Create a **private** storage bucket named `room-photos`
   (Dashboard -> Storage -> New bucket, public = off).
6. Lock the public Data API: run `supabase/rls.sql` in the SQL editor.
   This enables row level security with no public policies - browsers can
   never read the tables directly; only the server (service role) can.

## Security posture

- Database and storage are reachable **only** through the server API routes
  (service-role key stays server-side; the anon key alone can do nothing once
  `rls.sql` is applied).
- Room photos live in a private bucket and are exposed as signed URLs valid
  for 7 days.
- `GET /api/makeover/:id` uses the unguessable makeover UUID as the access
  token (capability URL). There is no user login yet; treat makeover links as
  private links. Supabase Auth + per-user ownership policies are the planned
  next step before public launch.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it at https://vercel.com/new (sign in with GitHub).
3. Add the same env vars in Project Settings -> Environment Variables.
4. Deploy. API routes run server-side; `REPLICATE_*` and the service-role key
   stay off the client.

## Enable the optional AI room restyle

The AI restyle is off until the owner deliberately configures it.

1. Create/choose a Cloudflare account and review the current Workers AI plan and pricing.
2. Create a Cloudflare API token with the minimum Workers AI permissions required by the account.
3. In Vercel Project Settings → Environment Variables, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for the intended deployment environments. Keep both server-side (never prefix them with `NEXT_PUBLIC_`).
4. Set `DATABASE_URL` to the existing Supabase Postgres connection string. This is required for the shared, atomic daily usage cap.
5. In Supabase SQL Editor, run `supabase/ai-makeover-budget.sql` once.
6. Redeploy. The studio checks `/api/ai-makeover` and only enables the AI button when the credentials and daily-budget table are available.

The endpoint uses Cloudflare Workers AI `@cf/black-forest-labs/flux-2-klein-4b`, caps the shared daily reservation at 8,400 neurons, and applies a best-effort per-IP rate limit. Provider limits/pricing can change; verify them in your Cloudflare dashboard before enabling for users. A user photo is sent to Cloudflare only after the user checks the explicit consent box. The photo and output are not stored by Roomly. The existing local style planner works without any AI provider setup.

## API

- `POST /api/makeover` - create a makeover (persists to DB, uploads photo to
  Supabase Storage, starts a Replicate prediction when configured).
- `GET /api/makeover/:id` - poll makeover status; refreshes from Replicate.
- `GET /api/health` - configuration/reachability checks.
