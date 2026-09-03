# DailyClarity Platform Builder

A web-only Next.js platform for wellness and professional service businesses to preview, customize, purchase, and launch a premium website — without hiring a designer or waiting weeks.

**Live:** [dailyclarity.org](https://dailyclarity.org)

---

## What It Does

DailyClarity Platform Builder walks service businesses through a guided flow:

1. **Choose your niche** — aromatherapy, holistic medicine, private practice therapy, sound bath, or wellness coaching
2. **Preview your site live** — fill in your details and see a real template populate instantly
3. **Customize** — swap colors, fonts, images, and text through the visual editor
4. **Purchase** — checkout via Stripe; provisioning begins after the verified checkout event
5. **Manage via portal** — edit and publish changes anytime after launch

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Package manager | pnpm workspaces |
| Styling | Tailwind CSS |
| Database & Auth | Supabase (PostgreSQL + Storage) |
| Payments | Stripe Subscriptions |
| Hosting (customer sites) | Netlify (wildcard subdomain) |
| Email | Postmark |
| Analytics | Plausible / PostHog / GA4 (optional) |

---

## Monorepo Structure

```
platform-builder/
├── apps/
│   ├── client-template/      # Minimal provisioned-site application
│   └── generator-app/        # Main Next.js 15 app (this is the product)
│       ├── src/
│       │   ├── app/           # Next.js App Router pages and API routes
│       │   ├── components/    # React components
│       │   ├── lib/           # Server and client utilities
│       │   └── middleware.ts  # Security headers (CSP, X-Frame-Options, etc.)
│       ├── __tests__/         # Vitest unit tests
│       └── e2e/               # Playwright smoke tests
├── packages/
│   ├── template-factory/      # Deterministic curated-template exporter + QA
│   └── ...                    # Shared internal packages
├── .github/workflows/ci.yml   # CI pipeline
└── README.md
```

---

## Active Niches

| Slug | Label |
|------|-------|
| `aromatherapy` | Aromatherapy |
| `holistic_medicine` | Holistic Medicine |
| `private_practice_therapist` | Private Practice Therapist |
| `sound_bath` | Sound Bath |
| `wellness_coach` | Wellness Coach |

> Inactive niches (HVAC, dental, injury law) are commented out in the niche registry and redirect to the homepage.

---

## Local Development

### Prerequisites

- Node.js 22.x
- Corepack (the repository pins its pnpm release in `packageManager`)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/russlle2/platform-builder.git
cd platform-builder

# 2. Install dependencies
corepack enable
corepack install
pnpm install

# 3. Copy and fill in environment variables
cp apps/generator-app/.env.example apps/generator-app/.env.local

# 4. Start development server
pnpm dev
```

The app runs at `http://localhost:3000`.

---

## Environment Variables

All variables live in `apps/generator-app/.env.local` (local) or in your hosting provider's environment (production).

### Core

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Production domain — used for sitemap, canonical, OG tags. E.g. `https://dailyclarity.org` |
| `NEXT_PUBLIC_PLATFORM_URL` | No | Fallback if SITE_URL is not set |

### Supabase

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — never expose to clients |
| `DAILYCLARITY_SUPABASE_PROJECT_REF` | Yes | Safety pin for the dedicated DailyClarity project; must match the ref in `NEXT_PUBLIC_SUPABASE_URL` or checkout stays disabled |

> **Isolation gate:** use a dedicated DailyClarity Supabase project and replay every migration there. The launch-hardening migration enables RLS and revokes browser access to operational tables; verify the resulting policies before configuring live keys.

### Stripe

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_BASIC` | Yes | Price ID for Basic Services plan |
| `STRIPE_PRICE_GROWTH` | Yes | Price ID for Growth Partner plan |
| `STRIPE_PRICE_CUSTOM_BUILD` | For custom builds | Active one-time USD $500 Price ID; the server verifies type, currency, and amount |
| `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID` | Yes | Dedicated active Portal configuration with plan switching disabled until plan/service reconciliation is implemented |
| `STRIPE_TRIAL_DAYS` | No | Free trial length in days (default: 7, set 0 to disable) |

**Stripe Webhook Setup:**
1. In Stripe Dashboard → Webhooks → Add endpoint: `https://dailyclarity.org/api/stripe/webhook`
2. Pin the endpoint API version to `2026-08-26.dahlia` (the version used by the server-side Stripe client)
3. Select events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`
4. Copy the endpoint signing secret to `STRIPE_WEBHOOK_SECRET`
5. Test paid, trial (`no_payment_required`), delayed-payment success/failure, duplicate delivery, and subscription cancellation events in Stripe test mode before enabling live checkout

### Netlify (Customer Site Hosting)

| Variable | Required | Description |
|----------|----------|-------------|
| `NETLIFY_ACCESS_TOKEN` | Yes | Personal access token from Netlify |
| `NETLIFY_TEAM_SLUG` | No | Your Netlify team slug |
| `PLATFORM_DOMAIN` | Yes | Your wildcard domain (e.g. `dailyclarity.org`) |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | Yes | Same as above, accessible client-side |

**Netlify Wildcard DNS:** Add a wildcard CNAME `*.dailyclarity.org → [netlify-team].netlify.app`

### Postmark (Email)

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTMARK_SERVER_TOKEN` | For email | Server API token from Postmark |
| `EMAIL_FROM_ADDRESS` | For email | Verified sender address |
| `PLATFORM_OWNER_EMAIL` | No | Receives lead capture and alert notifications |

### Security

| Variable | Required | Description |
|----------|----------|-------------|
| `INTERNAL_ADMIN_TOKEN` | Yes | Protects `/api/portal/site`, `/api/sites/provision`, `/api/sites/domain`, `/api/integrations/status`. Generate: `openssl rand -hex 32` |
| `PORTAL_TOKEN_SECRET` | Yes | Signs private, slug-bound portal access tokens; generate at least 32 random bytes |
| `STRIPE_FULFILLMENT_WORKER_SECRET` | Yes | Authenticates queue dispatches to the Netlify background worker; generate independently with `openssl rand -hex 32` |
| `UPLOAD_TOKEN_SECRET` | Recommended | Dedicated signing secret for upload sessions; falls back to `PORTAL_TOKEN_SECRET` |
| `DRAFT_PROFILE_SECRET` | Recommended | Dedicated signing secret for draft profiles; falls back to `PORTAL_TOKEN_SECRET` |

### Test Purchase Gate

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_TEST_PURCHASE` | `false` | Set to `"true"` to enable test purchase endpoint |
| `TEST_PURCHASE_ADMIN_SECRET` | — | Required when test purchase is enabled. Pass as `x-test-purchase-secret` header |

> **Never enable test purchase in production.** It is disabled by default and requires both env vars plus a matching secret header.

### Analytics (All Optional)

| Variable | Provider | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Plausible | Your domain registered in Plausible |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | Default: `https://app.posthog.com` |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 | Measurement ID (`G-XXXXXXXXXX`) |

---

## Deployment

The app is deployed on Netlify (or any Next.js-compatible host).

### Netlify Setup

1. Connect the repo to Netlify
2. Set build command: `pnpm --filter @platform-builder/generator-app build`
3. Set publish directory: `apps/generator-app/.next`
4. Add all environment variables in Netlify → Site settings → Environment variables
5. Redeploy after adding variables

---

## Supabase Setup

Required tables (run migrations from `supabase/migrations/`):

- `site_slugs` — tracks reserved/provisioned customer slugs
- `portal_sites` — stores customer site configuration and hosting info
- `contact_messages` — contact form submissions from generated sites
- `lead_captures` — email/phone leads from the homepage
- `customer-images` storage bucket — customer-uploaded images

**RLS:** The launch-hardening migration enables RLS on operational tables and
revokes browser roles from service-only tables. Launch only after replaying the
entire migration chain in a clean, dedicated project and verifying the resulting
policies and grants.

Contact-form rows retain independent owner-notification and visitor-confirmation
states. During launch operations, monitor messages that still need attention:

```sql
select id, slug, visitor_email, owner_notification_status,
       visitor_confirmation_status, notification_last_error, created_at
from public.contact_messages
where owner_notification_status <> 'sent'
order by created_at desc;
```

---

## Curated Template Catalog

The launch catalog is generated deterministically from 60 checked-in foundations
(12 per active niche). Generation is network-free and does not publish anything.

```bash
# Export, validate, and review the curated catalog
pnpm --filter @platform/template-factory export:curated -- --output /absolute/path/to/curated-template-library

# Exercise the exact publisher contract without credentials or writes
node apps/generator-app/scripts/upload-templates-to-blobs.mjs --dry-run --root /absolute/path/to/curated-template-library

# Publish only after the dry-run report has been reviewed
node apps/generator-app/scripts/upload-templates-to-blobs.mjs --root /absolute/path/to/curated-template-library
```

The uploader publishes only templates that satisfy publication contract v2.
Legacy generated templates remain excluded until they are normalized and pass
the same contract.

---

## Test Commands

```bash
# Unit tests (Vitest)
pnpm test

# Watch mode
pnpm --filter @platform-builder/generator-app test:watch

# E2E tests (Playwright — runs against BASE_URL)
BASE_URL=http://localhost:3000 pnpm test:e2e

# TypeScript typecheck
pnpm typecheck

# Lint
pnpm lint

# Full validation (lint + typecheck + test + build)
pnpm validate
```

---

## Security Notes

- **`INTERNAL_ADMIN_TOKEN`**: Admin API endpoints require this token via `Authorization: Bearer <token>` or `x-internal-admin-token`. The custom-domain endpoint also accepts a valid slug-bound customer portal token.
- **Stripe webhook**: `/api/stripe/webhook` does NOT require admin auth — Stripe signs requests with `STRIPE_WEBHOOK_SECRET`. Never add auth to this route.
- **Stripe fulfillment queue**: verified event JSON is stored service-role-only, then dispatched to an authenticated Netlify background function. Failed work backs off, a five-minute sweep recovers missed/stale jobs, and attempt 8 becomes a retained dead letter. After fixing the cause, an operator can `POST {"eventId":"evt_..."}` to `/api/admin/stripe/fulfillment/retry` with `Authorization: Bearer $INTERNAL_ADMIN_TOKEN`.
- **Rate limiting**: Abuse-sensitive API routes have endpoint-specific in-memory limits plus a shared Netlify edge rule. Verify both code-based rules appear in every production deploy log; serverless instances do not share memory.
- **Path traversal**: Image deletion validates paths stay within the owner's upload directory.
- **CSP headers**: Set via middleware on all routes.
- **Test purchase**: Disabled by default. Enable only in staging with a strong secret.

> **Live-checkout gate:** verified Stripe events are durably queued before a
> fast `202` response. Netlify background fulfillment has database leases,
> exponential retry scheduling, dead-letter retention, and a five-minute
> recovery sweep. Apply the launch migration, configure the worker secret, and
> run the documented Stripe/Netlify test matrix before enabling live checkout.

Operational setup and recovery steps are in
[`docs/STRIPE_FULFILLMENT_RUNBOOK.md`](docs/STRIPE_FULFILLMENT_RUNBOOK.md).

---

## Analytics Integration

The analytics wrapper (`src/lib/analytics.ts`) supports Plausible, PostHog, and GA4 simultaneously. No code changes needed — set the relevant env vars and the scripts load automatically.

Key tracked events:
- `pricing_view` — pricing page visited
- `checkout_start` — checkout initiated
- `portal_saved` — portal changes saved
- `portal_domain_saved` — custom domain configured
