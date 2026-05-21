# Daily Clarity app — Launch Audit (separate product)

> **Note:** `dailyclarity.org` is **Platform Builder** (template marketplace). See `PLATFORM_BUILDER_LAUNCH_AUDIT.md` for that site.
>
> This document is only for the **Daily Clarity** AI assistant at `dailyclarity.netlify.app`.

## Executive summary

| URL | Product |
|-----|---------|
| **https://dailyclarity.org** | Platform Builder (correct) |
| **https://dailyclarity.netlify.app** | Daily Clarity AI app (separate) |

---

## Integrations on your real app (dailyclarity.netlify.app)

| Service | Status | Notes |
|---------|--------|-------|
| **Google Gemini AI** | Partially working | Was **hard-coded in the public JS bundle** (security risk). Fixed in this update: calls go through `/.netlify/functions/gemini`. **Rotate your Gemini API key immediately** in Google AI Studio. |
| **Supabase (auth + database)** | **Not connected in production** | Build uses placeholder URL/key → app runs in **free local-only mode** (data stays in browser). Set `SUPABASE_URL` + `SUPABASE_ANON_KEY` in Netlify and redeploy. Run `supabase-schema.sql` + `supabase-migrations/002_stripe_billing.sql`. |
| **Stripe (checkout + billing)** | **Not configured** | UI showed $7/mo and “billing portal” but nothing was wired. This update adds Netlify functions: `create-checkout`, `create-portal`, `stripe-webhook`. You must create a Stripe product/price and set env vars. |
| **Postmark / email** | Not used | No transactional email on Daily Clarity app. |
| **Calendly / booking** | Not present | App is SaaS tools, not appointment booking. |

---

## Checkout flow — before vs after

### Before (broken for revenue)

1. Homepage promises $7/mo and “7-day free trial”
2. Signup creates account (or local-only guest mode)
3. **No Stripe session** — users never pay
4. Account page “Open Billing Portal” button did nothing
5. `dailyclarity.org` showed a completely different product

### After (this update — requires your Stripe/Supabase setup)

1. User signs up (cloud mode with Supabase configured)
2. Redirect to **Stripe Checkout** (subscription + optional trial via `STRIPE_TRIAL_DAYS`)
3. Webhook updates `user_profiles.subscription_status` in Supabase
4. Account → **Open Billing Portal** for payment method / cancel

**Local mode** (no Supabase env): still free, device-only — good for demos, not for paid cloud users.

---

## Critical actions before tomorrow

### 1. Point dailyclarity.org at the correct Netlify site

In [Netlify → dailyclarity project](https://app.netlify.com/projects/dailyclarity):

1. **Domain management** → Add custom domain → `dailyclarity.org` (and `www`)
2. Update DNS at your registrar per Netlify’s instructions
3. **Remove** `dailyclarity.org` from the Platform Builder Netlify site (currently stealing traffic)

### 2. Netlify environment variables (Daily Clarity site)

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes | Server-side AI (functions only) |
| `SUPABASE_URL` | Yes (for paid cloud) | Auth + database |
| `SUPABASE_ANON_KEY` | Yes (for paid cloud) | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for webhooks) | Stripe webhook updates profiles |
| `STRIPE_SECRET_KEY` | Yes (for revenue) | Checkout + portal |
| `STRIPE_PRICE_ID` | Yes | e.g. `price_xxx` for $7/mo subscription |
| `STRIPE_WEBHOOK_SECRET` | Yes | From Stripe webhook endpoint |
| `STRIPE_TRIAL_DAYS` | Optional | e.g. `7` for free trial |

Redeploy after saving variables (build must see Supabase vars for cloud mode).

### 3. Stripe Dashboard

1. Create product: **Daily Clarity — $7/month**
2. Copy **Price ID** → `STRIPE_PRICE_ID`
3. Webhook endpoint: `https://dailyclarity.org/.netlify/functions/stripe-webhook`  
   Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Enable **Customer Portal** in Stripe settings

### 4. Rotate Gemini API key

The old key was exposed in the live bundle. Revoke it in Google AI Studio and set the new key only in Netlify (not in client code).

### 5. Supabase

1. Run `supabase-schema.sql` in SQL Editor (if not done)
2. Run `supabase-migrations/002_stripe_billing.sql`
3. Confirm RLS policies are enabled
4. Enable email confirmation if you want verified signups

---

## What’s on dailyclarity.org today (Platform Builder — separate product)

If you also operate Platform Builder on that domain:

| Integration | Production status |
|-------------|-------------------|
| Stripe secret | Connected |
| Stripe **prices** | **Missing** — checkout returns “Invalid or missing price configuration” |
| Supabase | Connected |
| Postmark email | **Missing** |
| Netlify provisioning API | **Missing** — paid sites won’t auto-deploy |
| `dailyclarity` client site | **Not provisioned** — no preview/portal record |

That stack is for selling website templates, not for Daily Clarity subscriptions.

---

## App features (working without cloud)

These work in **local mode** today:

- 5 AI tools (Mind Dump, Find Words, Decision Helper, Write The Hard Thing, Quick Reset)
- Personalization (when enough history exists)
- Insights / History (local storage)

These need **cloud + env vars**:

- Cross-device login
- Persistent insights in database
- Paid subscriptions

---

## Files changed in this launch fix

- `netlify/functions/gemini.ts` — secure AI proxy
- `netlify/functions/create-checkout.ts` — Stripe subscription checkout
- `netlify/functions/create-portal.ts` — billing portal
- `netlify/functions/stripe-webhook.ts` — subscription sync to Supabase
- `services/geminiService.ts` — client calls functions (no API key in bundle)
- `services/stripeService.ts` — checkout/portal helpers
- `services/personalizationService.ts` — uses function proxy
- `pages/Account.tsx`, `pages/Signup.tsx` — billing wired
- `App.tsx` — `BrowserRouter` for clean URLs on custom domain
- `netlify.toml`, `.env.example`, `supabase-migrations/002_stripe_billing.sql`

---

## Recommended launch order

1. Rotate Gemini key → set Netlify env → deploy Daily Clarity  
2. Configure Supabase + run migrations → redeploy  
3. Configure Stripe + webhook → test signup on `dailyclarity.netlify.app`  
4. Attach `dailyclarity.org` to Daily Clarity Netlify site  
5. Smoke test: signup → checkout → use tool → billing portal  

You do **not** need Platform Builder on `dailyclarity.org` unless that is intentional. For Daily Clarity revenue, the custom domain must serve the Daily Clarity Netlify project.
