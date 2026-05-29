# dailyclarity.org — Platform Builder launch runbook

Use this checklist to take **Platform Builder** (template marketplace at `dailyclarity.org`) live with paid checkout, email, and auto-provisioned customer sites.

> **Not the Daily Clarity app.** The AI product at `dailyclarity.netlify.app` is a separate repo (`TKHatton/Daily-Clarity`).

## 1. Merge and deploy code

1. Merge open PRs in order (or squash into one release branch):
   - Launch audit / product clarification
   - Checkout readiness UX
   - **This branch:** trial checkout, portal domain panel, `/api/platform/config`
2. Deploy `apps/generator-app` to Netlify (production branch `main` or your release branch).

## 2. Stripe (subscriptions + 7-day trial)

In [Stripe Dashboard](https://dashboard.stripe.com/products):

| Plan | Amount | Billing | Notes |
|------|--------|---------|--------|
| Basic Services | $20 | Monthly recurring | Copy **Price ID** → `STRIPE_PRICE_BASIC` |
| Growth Partner | $80 | Monthly recurring | Copy **Price ID** → `STRIPE_PRICE_GROWTH` |

Webhook endpoint (production):

```
https://dailyclarity.org/api/stripe/webhook
```

Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` (as already handled in code).

**Netlify env:**

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_TRIAL_DAYS=7
```

Checkout uses `trial_period_days` and `payment_method_collection: always` (card on file, no charge until trial ends).

**Local Cursor:** With Stripe MCP authenticated, you can list/create prices and confirm webhook endpoints without leaving the IDE.

## 3. Supabase

1. Run all migrations in `apps/generator-app/supabase/migrations/` on the production project.
2. Confirm tables: `site_slugs`, `portal_sites`, `contact_messages`, etc.
3. **Netlify env:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Local Cursor:** Supabase MCP can verify tables, RLS, and run SQL checks after auth.

## 4. Postmark (required before launch)

1. Create a Postmark server and verify sender domain (`dailyclarity.org` or subdomain).
2. **Netlify env:**

```bash
POSTMARK_SERVER_TOKEN=...
EMAIL_FROM_ADDRESS=hello@dailyclarity.org
```

Welcome email sends after successful checkout (see `src/lib/email.ts`).

## 5. Netlify provisioning (required for auto-launch)

1. [Personal access token](https://app.netlify.com/user/applications#personal-access-tokens) with site create permissions.
2. **Netlify env:**

```bash
NETLIFY_ACCESS_TOKEN=...
NETLIFY_TEAM_SLUG=your-team-slug
PLATFORM_DOMAIN=dailyclarity.org
NEXT_PUBLIC_PLATFORM_DOMAIN=dailyclarity.org
NEXT_PUBLIC_API_URL=https://dailyclarity.org
```

3. **DNS (platform):**
   - Apex: `dailyclarity.org` → generator app (existing)
   - Wildcard: `*.dailyclarity.org` → Netlify (customer subdomains)

Optional affiliate link for BYO domains in portal:

```bash
NEXT_PUBLIC_DOMAIN_AFFILIATE_URL=https://...
```

## 6. Smoke test (production)

| Step | URL / action | Expected |
|------|----------------|----------|
| Config | `GET /api/platform/config` | `{ platformDomain, trialDays, domainAffiliateUrl }` |
| Status | `GET /api/integrations/status` | `checkoutReady: true`, `fulfillmentReady: true` when all env set |
| Wizard | `/wizard` → preview | Slug reserved, preview loads |
| Pricing | `/pricing?slug=...` | Banners hidden; trial CTA works |
| Checkout | Choose plan | Stripe Checkout with 7-day trial |
| Webhook | Complete test payment | Site row in Supabase, Netlify site created |
| Portal | `/portal?slug=...` | Subdomain shown; custom domain form works post-provision |
| Email | Inbox | Welcome email received |

## 7. Verify integrations UI

- **Pricing page** shows amber banner if price IDs missing; cyan banner if Netlify token missing.
- **Portal** → Domain panel shows `slug.dailyclarity.org` and DNS steps after custom domain POST.

## 8. What Cloud Agent cannot do

Stripe and Supabase MCP report `needsAuth` in the **cloud agent** environment even when you authenticated locally. For MCP-assisted setup:

1. Open this repo in **local Cursor**.
2. Ensure Stripe + Supabase plugins show connected.
3. Ask the agent to: create/verify Stripe prices, audit Supabase schema, and paste resulting env vars into Netlify.

## Related docs

- `docs/PLATFORM_BUILDER_LAUNCH_AUDIT.md` — production audit snapshot
- `docs/DAILYCLARITY_LAUNCH_AUDIT.md` — separate Daily Clarity app notes
