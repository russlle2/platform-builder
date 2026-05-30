# DailyClarity Platform Builder

A web-only Next.js platform for wellness and professional service businesses to preview, customize, purchase, and launch a premium website — without hiring a designer or waiting weeks.

**Live:** [dailyclarity.org](https://dailyclarity.org)

---

## What It Does

DailyClarity Platform Builder walks service businesses through a guided flow:

1. **Choose your niche** — aromatherapy, holistic medicine, private practice therapy, sound bath, or wellness coaching
2. **Preview your site live** — fill in your details and see a real template populate instantly
3. **Customize** — swap colors, fonts, images, and text through the visual editor
4. **Purchase** — checkout via Stripe; your subdomain is provisioned within 48 hours
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
│   └── generator-app/        # Main Next.js 15 app (this is the product)
│       ├── src/
│       │   ├── app/           # Next.js App Router pages and API routes
│       │   ├── components/    # React components
│       │   ├── lib/           # Server and client utilities
│       │   └── middleware.ts  # Security headers (CSP, X-Frame-Options, etc.)
│       ├── __tests__/         # Vitest unit tests
│       └── e2e/               # Playwright smoke tests
├── packages/                  # Shared internal packages
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

- Node.js 20+
- pnpm (via Corepack: `corepack enable && corepack prepare pnpm@latest --activate`)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/russlle2/platform-builder.git
cd platform-builder

# 2. Install dependencies
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

> **RLS Note:** `site_slugs` and `contact_messages` tables currently have RLS disabled. Enable RLS and add appropriate policies before going to production with real user data.

### Stripe

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_BASIC` | Yes | Price ID for Basic Services plan |
| `STRIPE_PRICE_GROWTH` | Yes | Price ID for Growth Partner plan |
| `STRIPE_TRIAL_DAYS` | No | Free trial length in days (default: 7, set 0 to disable) |

**Stripe Webhook Setup:**
1. In Stripe Dashboard → Webhooks → Add endpoint: `https://dailyclarity.org/api/stripe/webhook`
2. Select events: `checkout.session.completed`, `customer.subscription.created`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

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

**RLS:** Currently disabled on `site_slugs` and `contact_messages`. Enable before handling sensitive user data.

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

- **`INTERNAL_ADMIN_TOKEN`**: All admin API endpoints (`/api/portal/site`, `/api/sites/provision`, `/api/sites/domain`, `/api/integrations/status`) require this token via `Authorization: Bearer <token>` or `x-internal-admin-token` header. Generate a strong random value.
- **Stripe webhook**: `/api/stripe/webhook` does NOT require admin auth — Stripe signs requests with `STRIPE_WEBHOOK_SECRET`. Never add auth to this route.
- **Rate limiting**: All public API routes have in-memory rate limiting. Complement with edge-level rate limiting (Netlify, Cloudflare) for strict enforcement.
- **Path traversal**: Image deletion validates paths stay within the owner's upload directory.
- **CSP headers**: Set via middleware on all routes.
- **Test purchase**: Disabled by default. Enable only in staging with a strong secret.

---

## Analytics Integration

The analytics wrapper (`src/lib/analytics.ts`) supports Plausible, PostHog, and GA4 simultaneously. No code changes needed — set the relevant env vars and the scripts load automatically.

Key tracked events:
- `pricing_view` — pricing page visited
- `checkout_start` — checkout initiated
- `portal_saved` — portal changes saved
- `portal_domain_saved` — custom domain configured
