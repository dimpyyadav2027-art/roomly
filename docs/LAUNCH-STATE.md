# Roomly launch state (2026-10-17)

## Live
- Production: https://roomly-pi-mauve.vercel.app (Vercel Hobby, dimpy1) - stateless demo. Zero Production env vars by design. Auto-deploys from `main`.
- Protected preview: https://roomly-git-preview-auth-dimpy1.vercel.app - behind Vercel Authentication. Preview-scoped env vars (DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY [Config], SUPABASE_SERVICE_ROLE_KEY [Secret], ENABLE_PERSISTENCE=true), branch-scoped to `preview-auth`. Real backend live there.

## Verified
- Owner isolation on deployed preview: unauth POST 401; owner GET 200; non-owner/anon GET 404. Session = Supabase getUser(token) server-side; ownership by email from the verified token, not client-supplied.
- Magic-link roundtrip (one approved test email to owner MU inbox): link -> session -> authenticated persisted write, owner-scoped.
- Abuse controls: in-memory 20/hr per-IP per instance + durable atomic cap 20/user/UTC-day via row-locked `daily_caps` upsert (concurrency-tested: at n=19, 5 parallel -> exactly 1 pass).
- Public demo: every control does an honest action; AI generation off; uploaded photo remains unchanged and uncropped; no fake stock after-image/comparison; sample decor list is explicitly not AI-generated; photo stays client-local.

## Blocker: public sign-in
- Supabase default SMTP sends auth email ONLY to Supabase org members (policy: https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider). Org = 1 member (owner MU email). Any other sign-in email -> "Email address not authorized". No custom SMTP configured (Auth > SMTP).
- Options: (a) free SMTP sender account (needs sender verification by owner); (b) Google OAuth via Supabase (no email sending; needs a Google Cloud OAuth client: consent screen External, non-sensitive scopes = no Google verification needed, redirect URI https://zvcnheipmtlcdgxecbte.supabase.co/auth/v1/callback, then enable Google provider in Supabase dashboard; app code needs a "Continue with Google" button calling supabase.auth.signInWithOAuth({provider:"google"})). Both need owner approval before account changes.

## Before public auth/persistence goes live
1. Choose (a) or (b) above and configure.
2. Add production origin to Supabase Auth redirect URLs; set Site URL to production.
3. Add the same 5 env vars scoped to Production.
4. Rerun unauth/owner/non-owner checks against production; visual verify login + saved UI.
5. Keep photos client-local unless storage-auth review is done.

## UI audit completed (22:42 IST)
- Production code 16d4951, protected preview code 44bbad0. Photo workspace: 400px high at mobile widths, 520px at tablet/desktop, desktop photo gets the wide column.
- Real interaction checks at 390/1280: photo-required guard, native file chooser/upload, photo unchanged before/after plan, room-type/style/budget changes, all item selections, list add/remove/totals, actual text download read back, How it works from studio, feature status, sign-in unavailable message, home/start navigation. No page errors and no image bytes in POST payload.
- Pixel inspection at 360/390/820/1024/1280: no horizontal overflow or clipped controls. Sample list honestly reports over-budget totals. Retailer links/checkout are not live and not claimed.

## Free image-redesign research
No fully verified free public route ready to enable. No new service account/token, no payments, no image transfer performed.
- Gemini image API: current pricing lists no free tier for image-generation models: https://ai.google.dev/gemini-api/docs/pricing
- HF Inference Providers: free users currently have no included credits: https://huggingface.co/docs/inference-providers/pricing
- Cloudflare img2img: fetched docs stale; live model page redirects to https://developers.cloudflare.com/workers-ai/models/?unavailable=stable-diffusion-v1-5-img2img . Reject this candidate.
- Distinct Cloudflare inpainting model is still listed live, Beta $0.00/step, image+mask inputs: https://developers.cloudflare.com/workers-ai/models/stable-diffusion-v1-5-inpainting/ . Plausible experiment only, not API-verified or quality-verified. Its linked original upstream model/license repositories are gone; current mirror is explicitly unaffiliated with RunwayML.
- Free plan limits fail instead of charging; paid overage requires Workers Paid: https://developers.cloudflare.com/workers-ai/platform/pricing/ . Actual account/plan unverified (dashboard signed out; no new account or service consent granted).
- Standard inference zero-retention/no-training commitment has operational metadata/legal exceptions; storage/logging/caching/stateful features differ: https://developers.cloudflare.com/workers-ai/platform/data-usage/ . Enabling any provider would require changing current device-local privacy copy and explicit image-transfer consent.
- Next decision, only if desired: permission to access/create a strictly Free Cloudflare account for an artificial-room-image experiment, with no paid plan/payment method. Account-specific free-only checks and sample quality/safety must pass before public enablement or user-photo transfer. Diffusion does not guarantee faithful room structure.

## Still unresolved
- Google Cloud project/OAuth setup using MU identity: separately asked, not approved by the later UI-fix Okay. Held.
- Original homework brief, domain expectation and deadline were not supplied; not claimed homework-ready.

## Second improvement pass (22:59 IST)
- User asked to make it better and send link when done. Public URL unchanged; UI commit ffef433, preview a2de33e.
- Now a local room planner with four editorial style plans, six distinct ideas per style, named palettes and styling steps, deterministic within-budget selection, budget meter and Fit list action. All prices are illustrative allocations, not live retailer quotes. No image inference claimed.
- Full-screen unchanged photo viewer, Escape close, wide two-column workspace with decor results below. Never substitutes a stock room for an uploaded/reloaded photo.
- Explicit Save/Load/Clear on this device stores only theme, roomType, budget, cart IDs, generated flag under roomly-brief-v1. No photo or token stored. Photo must be selected again after refresh. This is browser-local storage, not cloud/account persistence.
- Downloaded text plan includes items/totals, styling steps and palette values. File inspected after actual download.
- Planner no longer calls POST /api/makeover or pretends to generate an image. The existing backend routes/auth isolation are unchanged. Protected backend test results above refer to those routes, not a cloud-save UI now present in production.
- Live interaction tests passed at 390/1280, all four styles, budget fitting, file picker, unchanged photo, full photo viewer, local save/refresh/load/clear, real export. Extra responsive/budget tests at 360/820/1280 and budgets 2000/2500/6000/10000; no overflow/page errors/photo transfer. Actual pixels inspected for workspace/results/steps. Screenshots use a locally made synthetic room illustration as the test input, not a claimed AI output.
- Public AI/auth and prior account/OAuth consent gaps remain; no provider setup, paid services, or user-photo transfer occurred.
