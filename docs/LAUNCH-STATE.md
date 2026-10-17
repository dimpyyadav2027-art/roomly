# Roomly launch state (2026-10-17)

## Live
- Production: https://roomly-pi-mauve.vercel.app (Vercel Hobby, dimpy1) - stateless demo. Zero Production env vars by design. Auto-deploys from `main`.
- Protected preview: https://roomly-git-preview-auth-dimpy1.vercel.app - behind Vercel Authentication. Preview-scoped env vars (DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY [Config], SUPABASE_SERVICE_ROLE_KEY [Secret], ENABLE_PERSISTENCE=true), branch-scoped to `preview-auth`. Real backend live there.

## Verified
- Owner isolation on deployed preview: unauth POST 401; owner GET 200; non-owner/anon GET 404. Session = Supabase getUser(token) server-side; ownership by email from the verified token, not client-supplied.
- Magic-link roundtrip (one approved test email to owner MU inbox): link -> session -> authenticated persisted write, owner-scoped.
- Abuse controls: in-memory 20/hr per-IP per instance + durable atomic cap 20/user/UTC-day via row-locked `daily_caps` upsert (concurrency-tested: at n=19, 5 parallel -> exactly 1 pass).
- Public demo: every control does an honest action; AI generation off; results labeled sample/demo; photo stays client-local.

## Blocker: public sign-in
- Supabase default SMTP sends auth email ONLY to Supabase org members (policy: https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider). Org = 1 member (owner MU email). Any other sign-in email -> "Email address not authorized". No custom SMTP configured (Auth > SMTP).
- Options: (a) free SMTP sender account (needs sender verification by owner); (b) Google OAuth via Supabase (no email sending; needs a Google Cloud OAuth client: consent screen External, non-sensitive scopes = no Google verification needed, redirect URI https://zvcnheipmtlcdgxecbte.supabase.co/auth/v1/callback, then enable Google provider in Supabase dashboard; app code needs a "Continue with Google" button calling supabase.auth.signInWithOAuth({provider:"google"})). Both need owner approval before account changes.

## Before public auth/persistence goes live
1. Choose (a) or (b) above and configure.
2. Add production origin to Supabase Auth redirect URLs; set Site URL to production.
3. Add the same 5 env vars scoped to Production.
4. Rerun unauth/owner/non-owner checks against production; visual verify login + saved UI.
5. Keep photos client-local unless storage-auth review is done.
