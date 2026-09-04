# DailyClarity Functional Test Matrix

**Scope:** `apps/generator-app` — main platform at [dailyclarity.org](https://dailyclarity.org)  
**Audit date:** Phase 0 Launch Readiness (read-only)  
**Total features:** 87

## Legend — Known status

| Symbol | Meaning |
|--------|---------|
| ✅ Expected working | Implementation complete; low-risk based on code + existing E2E |
| ⚠️ Suspected issue | Partial implementation, env-dependent, or UX gap |
| ❌ Known broken | Confirmed defect in code or plan |
| 🔲 Needs verification | Requires manual/staging/production test |

---

## Test matrix

| # | Feature / Route | Test method | Expected | Known status | Notes |
|---|-----------------|-------------|----------|--------------|-------|
| **A. Global (all pages)** |
| 1 | Main navigation links work | E2E + manual click-through | Home, Templates dropdown (5 niches → intake), Preview Your Business, Watch Demo, Pricing, Portal, Contact all resolve without 404 | ✅ Expected working | Nav defined in `AppLayout.tsx`; mobile menu mirrors desktop |
| 2 | Lead capture modal (25s timer + exit intent → `/api/leads`) | Manual (wait 25s); manual (mouse to top edge) | Modal opens once per session; POST succeeds; success message shown | ✅ Expected working | Skipped on `/preview*` and `/__site*` paths; uses `sessionStorage.lead_modal_seen` |
| 3 | AI support chatbot (`/api/chat` → OpenAI) | Manual chat; API POST with sample messages | Floating widget opens; assistant replies when `OPENAI_API_KEY` set | 🔲 Needs verification | Fails gracefully without API key; rate limits not audited |
| 4 | JSON-LD / SEO metadata present | View source; Rich Results Test | Root layout injects Organization/WebSite/Service schemas; homepage adds WebApplication graph; niche pages have title/description | ✅ Expected working | Homepage also embeds inline `@graph` JSON-LD |
| 5 | Analytics scripts loading (Plausible/GA4/PostHog) | DevTools Network tab | Plausible + GA4 load when env vars set; events fire via `track()` | ⚠️ Suspected issue | `NEXT_PUBLIC_POSTHOG_KEY` documented but **no PostHog loader in `layout.tsx`** — events never reach PostHog unless injected elsewhere |
| **B. Marketing / Landing pages** |
| 6 | `/` homepage loads, niche cards, CTAs | E2E (`public-routes.spec.ts`) | 200; h1 visible; niche cards show template counts from registry; CTAs to `/preview-your-business` and `/demo/platform-builder` | ✅ Expected working | Template total computed from `getNiches()` |
| 7 | `/pricing` loads, plans shown | E2E | Two plan cards (Basic $20, Security + Ads $80); checkout buttons present | ✅ Expected working | Trial days from `/api/platform/config` |
| 8 | `/pricing/review-profile` loads, session pre-filled | Manual after wizard | Fields populated from `sessionStorage.pb_template_values`; confirm sets `pb_profile_reviewed` and returns to pricing | ✅ Expected working | Redirect gate in `PricingClient.startCheckout` |
| 9 | `/contact` loads, form submits | E2E (form visible); manual submit | Form renders; POST to contact API succeeds; success UI | 🔲 Needs verification | E2E only asserts form visibility, not submission |
| 10 | `/proof` loads | Manual GET | Page renders early-access / proof placeholder content | 🔲 Needs verification | Static marketing page exists |
| 11 | `/demo` loads | E2E | Hub with walkthrough h1 and link to platform overview | ✅ Expected working | |
| 12 | `/demo/platform-builder` loads with video | E2E + visual | Page loads; demo video/walkthrough content visible | 🔲 Needs verification | E2E checks h1 only; video playback not asserted |
| 13 | `/demo/aromatherapy` loads | Manual GET | Niche-specific demo page renders | 🔲 Needs verification | Dynamic route `demo/[niche]/page.tsx` |
| 14 | `/demo/holistic_medicine` loads | Manual GET | Same as above | 🔲 Needs verification | |
| 15 | `/demo/private_practice_therapist` loads | Manual GET | Same as above | 🔲 Needs verification | |
| 16 | `/demo/sound_bath` loads | Manual GET | Same as above | 🔲 Needs verification | |
| 17 | `/demo/wellness_coach` loads | Manual GET | Same as above | 🔲 Needs verification | |
| 18 | `/aromatherapy` niche landing loads | Manual GET | Full landing: hero, funnel, CTAs to intake/demo/pricing | ✅ Expected working | Uses `NicheExampleGallery` (static screenshots) |
| 19 | `/holistic_medicine` niche landing loads | Manual GET | Same structure | ✅ Expected working | |
| 20 | `/private_practice_therapist` niche landing loads | Manual GET | Same structure | ✅ Expected working | |
| 21 | `/sound_bath` niche landing loads | Manual GET | Same structure | ✅ Expected working | |
| 22 | `/wellness_coach` niche landing loads | E2E (title dedup) | Same structure; title contains DailyClarity once | ✅ Expected working | |
| 23 | `/aromatherapy-website-builder` loads | Manual GET | SEO landing page renders | 🔲 Needs verification | Listed in sitemap |
| 24 | `/website-builder-for-therapists` loads | Manual GET | SEO landing page renders | 🔲 Needs verification | |
| 25 | `/website-builder-for-wellness-coaches` loads | Manual GET | SEO landing page renders | 🔲 Needs verification | |
| 26 | `/sound-bath-website-template` loads | Manual GET | SEO landing page renders | 🔲 Needs verification | |
| 27 | `/wellness-website-checklist` loads | Manual GET | SEO landing page renders | 🔲 Needs verification | |
| 28 | `/dailyclarity-vs-wix` loads | Manual GET | Comparison page renders | 🔲 Needs verification | |
| 29 | `/success` renders (Stripe `session_id`) | Manual after checkout; API mock | Valid `session_id` → payment confirmed UI; invalid/missing → error state with support links | ✅ Expected working | Server-side Stripe session retrieve; `dynamic = 'force-dynamic'` |
| 30 | `/cancel` renders | Manual (Stripe cancel URL) | Checkout canceled message; links to pricing and wizard | ✅ Expected working | |
| 31 | `/sitemap.xml` returns valid XML | API GET; unit test | Valid sitemap with marketing URLs | ✅ Expected working | `sitemap.ts`; `__tests__/sitemap.test.ts` |
| 32 | `/robots.txt` returns correct content | API GET | Allows `/`; disallows `/api/`, `/portal`, `/success`, `/cancel`, `/_next/`; sitemap URL | ✅ Expected working | `robots.ts` |
| **C. Preview-your-business wizard (5 steps)** |
| 33 | Step 1 (info): fields, niche picker, validation | Manual wizard | Required: business name, niche, email; niche grid of 5; placeholders per niche | ✅ Expected working | Validation blocks advance |
| 34 | Step 2 (style): vibes, prose, color mood, font, layout | Manual wizard | Up to 3 vibes; prose radio; 6 color moods; font + layout density selectors | ✅ Expected working | |
| 35 | Step 3 (matching): auto-match + 2 alternatives | Manual wizard | Scoring algorithm picks best template; shows 2 alternative styles | ✅ Expected working | Falls back if no templates for niche |
| 36 | Client readiness panel renders | Manual wizard | `ClientReadinessPanel` on matching + editor steps | ✅ Expected working | Driven by `computeClientReadiness()` |
| 37 | Step 4 (editor): iframe preview loads | Manual wizard | POST `/api/templates/.../preview` returns HTML in iframe | ✅ Expected working | 20s abort timeout with retry |
| 38 | Inline text editing (dblclick in iframe) | Manual in iframe | dblclick makes element editable; blur posts `textEdited` to parent; persisted in `sessionStorage` | ✅ Expected working | Touch double-tap on mobile |
| 39 | Image upload + swap (`/api/upload`) | Manual click image in iframe | File picker → upload → iframe image updates; persisted in `pb_image_swaps` | 🔲 Needs verification | Requires Supabase storage configured |
| 40 | Color presets change iframe CSS | Manual editor | Preset/custom colors inject `#pb-custom-styles` into iframe | ✅ Expected working | **Not passed to checkout metadata** (see defects) |
| 41 | Font presets change iframe CSS | Manual editor | Font presets inject Google Fonts + CSS vars | ✅ Expected working | **Not passed to checkout metadata** (see defects) |
| 42 | Multi-page navigation in preview | Manual iframe links + page buttons | index/about/services/contact load via postMessage | ✅ Expected working | |
| 43 | Step 5 (browse): 12 templates, Load More | Manual browse step | Paginated `GET /api/templates/[niche]?page=&limit=12&seed=`; Load More appends | ✅ Expected working | |
| 44 | CTA to `/pricing` preserves session context | Manual | Editor "Purchase & Launch" links with `template` + `niche` query; values in `sessionStorage` | ⚠️ Suspected issue | URL carries template/niche; custom colors/fonts from editor step omitted from checkout context |
| **D. Template & Portal APIs** |
| 45 | `GET /api/templates/[niche]` lists templates (pagination) | API test | Returns templates, total, page, hasMore; `all=true` returns full list | ✅ Expected working | Seeded shuffle for pagination |
| 46 | `GET /api/templates/[niche]/[slug]` returns metadata | API test | Template meta: name, fields, pages, snippet | ✅ Expected working | |
| 47 | `POST /api/templates/[niche]/[slug]/preview` returns hydrated HTML | API test | HTML + css + variationCSS for given values/variations | ✅ Expected working | |
| 48 | `GET /api/templates/[niche]/[slug]/html` returns raw HTML | API test | Unhydrated template HTML | ✅ Expected working | |
| 49 | `GET /api/templates/[niche]/[slug]/assets/[...path]` serves assets | API test | Static assets (CSS, images, JS) with correct MIME | ✅ Expected working | |
| 50 | `GET /api/templates/variations` returns variation options | API test | Color/font/structure variation definitions | ✅ Expected working | |
| 51 | `GET /api/platform/config` returns public config | API test | platformDomain, trialDays, domainAffiliateUrl | ✅ Expected working | Used by portal + pricing |
| **E. Checkout + billing** |
| 52 | `/pricing/review-profile` gate (redirect if not reviewed) | Manual checkout click | Unreviewed profile → redirect to review-profile with plan param | ✅ Expected working | `pb_profile_reviewed` flag |
| 53 | `POST /api/stripe/checkout` creates session, redirects | API + manual; smoke script | Returns `{ url }` pointing to checkout.stripe.com; metadata includes slug, template, chunked customerValues | ✅ Expected working | `scripts/smoke-fulfillment.ts` hits production |
| 54 | Stripe webhook handles `checkout.session.completed` | Webhook test; smoke script | Provisions Netlify site, upserts portal_sites, sends emails, reserves slug | 🔲 Needs verification | Requires Stripe webhook + Netlify + Supabase in prod |
| 55 | `/success` page verifies session | Manual with real session_id | See #29 | ✅ Expected working | |
| 56 | `/cancel` page renders | Manual | See #30 | ✅ Expected working | |
| 57 | `POST /api/test-purchase` when `ENABLE_TEST_PURCHASE=true` | Dev manual; smoke gate | 403 in production; full pipeline in dev when enabled | ✅ Expected working | UI on pricing when `NEXT_PUBLIC_APP_STAGE !== 'production'` |
| **F. Customer portal** |
| 58 | `/portal` with no slug/token shows sign-in prompt | E2E | Lookup UI; explains welcome-email token requirement | ✅ Expected working | |
| 59 | `/portal?slug=&token=` loads site data | Manual with test-purchase token | Authenticated: form populated from portal_sites.data | 🔲 Needs verification | Token stripped from URL after load |
| 60 | Edit business details form works | Manual portal | Fields editable when authenticated | ✅ Expected working | Disabled when unauthenticated |
| 61 | Save & publish triggers Netlify republish | Manual portal save | POST `/api/portal/customer` with `x-portal-token`; `republished: true` when Netlify configured | 🔲 Needs verification | Uses portal token (not admin token) |
| 62 | Custom domain connect + DNS instructions | Manual portal | POST `/api/sites/domain`; DNS pre block shown | 🔲 Needs verification | |
| 63 | Integration status panel renders | Visual | Postmark, Supabase, Stripe, Netlify rows visible | ⚠️ Suspected issue | Hardcoded `"Checking..."` — client fetch intentionally omitted (admin-only API) |
| 64 | Onboarding checklist shows | Visual | 4 steps with links | ⚠️ Suspected issue | Checklist links work but header shows static **"1/4"** and **"Awaiting onboarding completion"** — not driven by real progress |
| 65 | Provisioning status displayed correctly | Manual portal | pending / active / failed banners based on site status | ✅ Expected working | |
| 66 | Link to visual template editor works | Manual portal | Link to `/templates/[niche]/[slug]?portalSlug=` when template known | ✅ Expected working | Middleware allows when `portalSlug` present |
| **G. Template editor (post-purchase)** |
| 67 | `/templates/[niche]/[slug]?portalSlug=...` loads (not redirected) | Manual + middleware test | Page loads; middleware skips redirect when portalSlug set | ✅ Expected working | Without portalSlug → redirect to intake |
| 68 | Inline edits persist | Manual in template editor | Same iframe edit flow as wizard; session/local persistence | ✅ Expected working | |
| 69 | Image swap works | Manual | Same upload flow as wizard | 🔲 Needs verification | |
| 70 | Color/font/structure variations apply | Manual | Variation selectors affect preview API payload | ✅ Expected working | |
| 71 | "Publish to live site" button | Manual click | Saves to portal + redeploys live site | ❌ Known broken | Calls `POST /api/portal/site` **without** `INTERNAL_ADMIN_TOKEN`; route requires admin auth. Portal save path is `/api/portal/customer` with `x-portal-token` |
| **H. Redirects + middleware** |
| 72 | `/templates` → `/preview-your-business` | E2E | 307/308 to intake | ✅ Expected working | `middleware.ts` |
| 73 | `/templates/[niche]` → `/preview-your-business?niche=...` | E2E | Niche query param preserved | ✅ Expected working | |
| 74 | `/templates/[niche]/[slug]` → intake (unless portalSlug) | Manual | Redirect unless `?portalSlug=` | ✅ Expected working | |
| 75 | `/wizard` → `/preview-your-business` | Manual GET | Server redirect | ✅ Expected working | `wizard/page.tsx` |
| 76 | `/hvac` → `/` | E2E | Redirect to home | ✅ Expected working | Legacy HVAC niche removed |
| 77 | `/app` → `/` | Manual GET | Server redirect | ✅ Expected working | `app/page.tsx` |
| **I. Contact + leads APIs** |
| 78 | `POST /api/forms/contact` (visitor forms on live sites) | API test on customer site | Inserts inquiry; sends Postmark to owner + visitor confirmation | 🔲 Needs verification | Requires Postmark + Supabase |
| 79 | `POST /api/leads` (homepage lead modal) | Manual modal submit | Lead stored; owner notified if configured | 🔲 Needs verification | |
| 80 | `POST /api/upload` (image upload) | Manual wizard image swap | Returns public URL; stores in Supabase `customer-images` | 🔲 Needs verification | |
| 81 | `POST /api/chat` (chatbot) | API POST | Returns `{ message }` from OpenAI | 🔲 Needs verification | Requires `OPENAI_API_KEY` |
| **J. Legacy / placeholder pages** |
| 82 | `/editor` (drag-drop stub) | Manual GET | Stub UI with component panel; Publish/Preview non-functional | ⚠️ Suspected issue | Not linked from main nav; separate from product wizard |
| 83 | `/live-demo` (marketing stub) | Manual GET | Static marketing copy; CTA to wizard | ⚠️ Suspected issue | Duplicates `/demo` funnel |
| 84 | `/builds` (placeholder) | Manual GET | "No builds yet" + CTA to wizard | ⚠️ Suspected issue | Not linked from nav |
| 85 | `/archive` (static mock cards) | Manual GET | Mock template cards; "Use Template" button does nothing | ❌ Known broken | Buttons have no href/onClick; images may 404 |
| 86 | `/app` (redirects to `/`) | Manual GET | Redirect | ✅ Expected working | See #77 |
| 87 | `/[niche]` example gallery (static screenshots only) | Visual on niche pages | Gallery shows static PNGs; all cards link to intake (not specific templates) | ⚠️ Suspected issue | Documented in `NicheExampleGallery` copy; no live template previews on landing |

---

## Legacy Page Decisions

| Page | Recommendation | Rationale |
|------|----------------|-----------|
| `/editor` | **REMOVE** | Orphan drag-and-drop prototype (`editorStore`, `ComponentPanel`). Not linked from production nav. Conflicts with the real preview wizard and post-purchase template editor. Keeping it risks support confusion ("which editor?"). |
| `/live-demo` | **REMOVE** | Redundant with `/demo` and `/demo/platform-builder`, which are linked from nav and E2E-covered. `/live-demo` is an older stub with overlapping messaging. |
| `/builds` | **REMOVE** | Placeholder with no backend. Portal is the post-purchase "my site" surface. Dead end for users who stumble on the URL. |
| `/archive` | **REMOVE** | Non-functional "Use Template" buttons and hardcoded mock data. Real browsing lives in wizard Step 5 and `/api/templates`. Creates false affordance. |
| `/app` | **KEEP (redirect)** | Harmless legacy URL → `/`. Low cost; avoids broken bookmarks. |

**Note on #87:** The `/[niche]` gallery is **not** a legacy page — it is active marketing. Recommendation: **enhance** (link cards to specific templates or live mini-previews) rather than remove the section.

---

## Defects Summary

Defects from the Launch Readiness Plan:

1. **Template editor publish broken** — `templates/[niche]/[slug]/page.tsx` `publishToLiveSite()` POSTs to `/api/portal/site` without `Authorization: Bearer ${INTERNAL_ADMIN_TOKEN}`. That route calls `requireInternalAdminOrThrow()` and returns 401. Fix: use `/api/portal/customer` with `x-portal-token` (same as portal Save & publish).

2. **Portal integrations panel hardcoded "Checking..."** — `PortalClient.tsx` sets `integrationDefaults` to `"Checking..."` and explicitly omits client fetch (admin-only `/api/integrations/status`). Users never see real connection status.

3. **Intake `draft_profiles` capture: API exists but no UI calls it** — `/api/profile/save-draft` is implemented with Supabase migration, but no wizard or pricing component invokes it. Pre-purchase recovery is dead code from the user perspective.

4. **Custom colors/fonts from intake editor not passed into checkout metadata** — Editor Step 4 `customColors` / `customFonts` are iframe-only. Checkout sends `colorScheme` / `fontVariation` from URL defaults (`original`) or style-quiz mood (`colorMood`), not editor presets. Purchased sites may not match preview customization.

5. **Schema drift: `orders` / `booking_inquiries` / `newsletter_subscribers` policies without create migrations** — Hardening migrations (`20260617215143`, `20260617215232`) alter/revoke policies on tables with **no `create table` migration** in repo. Fresh Supabase installs may fail or lack these tables.

6. **Niche list duplicated across 5+ files** — Active niches repeated in: `niche-registry.ts` (`NICHE_META`), `AppLayout.tsx` (`nicheLinks`), `PreviewYourBusinessClient.tsx` (`NICHE_OPTIONS`), `[niche]/page.tsx` (`nicheLandingContent` keys), `sitemap.ts`, E2E specs. Adding/removing a niche requires multi-file edits.

7. **`PORTAL_TOKEN_SECRET` missing from `.env.example`** — Required by `portal-auth.ts` for token hashing. Documented in portal dev banner but not in env template (unlike `INTERNAL_ADMIN_TOKEN`).

---

## Additional defects discovered during audit

| # | Defect | Severity | Location |
|---|--------|----------|----------|
| A1 | **PostHog never initialized** — env vars and `analytics.ts` support PostHog, but `layout.tsx` only loads Plausible + GA4 scripts | Medium | `src/app/layout.tsx`, `src/lib/analytics.ts` |
| A2 | **Portal onboarding progress is static** — "1/4" checklist and "Awaiting onboarding completion" do not reflect actual customer state | Low | `PortalClient.tsx` header panel |
| A3 | **`/archive` "Use Template" buttons are inert** — no navigation or click handler | Medium | `src/app/archive/page.tsx` |
| A4 | **Duplicate `NEXT_PUBLIC_SITE_URL` entry in `.env.example`** (lines 4 and 10) | Low | `.env.example` |
| A5 | **Homepage JSON-LD offers price hardcoded to $20** while two plans exist ($20 / $80) | Low | `src/app/page.tsx` |
| A6 | **Pricing testimonials appear fabricated** (named quotes without verification disclaimer beyond FAQ elsewhere) | Low | `PricingClient.tsx` |
| A7 | **Middleware CSP allows `'unsafe-eval'`** — broader than typical production hardening | Info | `middleware.ts` |
| A8 | **Lead modal marks `lead_modal_seen` on timer fire before submit** — user who dismisses without submitting won't see exit-intent later in same session | Low | `LeadCaptureModal.tsx` |
| A9 | **Success page does not surface slug/portal link from verified session** — customer must navigate to portal without deep link from success UI | Low | `success/page.tsx` (slug retrieved but not displayed) |

---

## Existing automated coverage

| Asset | Coverage |
|-------|----------|
| `e2e/public-routes.spec.ts` | Homepage, wizard, pricing, contact form, portal signed-out, `/hvac`, niche title, demo hub/platform, template redirect, CTA links |
| `scripts/smoke-fulfillment.ts` | Production checkout session creation, webhook signature gate, Supabase probe, test-purchase gate |
| `__tests__/sitemap.test.ts` | Sitemap URL list |
| `__tests__/portal-auth.test.ts` | Portal token hashing (requires `PORTAL_TOKEN_SECRET`) |
| `__tests__/security.test.ts` | Internal admin token validation |

---

## Recommended test execution order (launch)

1. Run Playwright E2E suite locally against staging.
2. Run `npx tsx scripts/smoke-fulfillment.ts` against production (read-only checks).
3. Manual wizard happy path: info → style → match → edit text → browse → review-profile → checkout (Stripe test mode).
4. Dev `Simulate Purchase` → portal token link → Save & publish → verify `{slug}.dailyclarity.org`.
5. Explicit regression on **#71** (template editor publish) after fix.
6. Verify analytics in production Network tab (Plausible/GA4; PostHog after loader fix).

---

*Generated by Phase 0 read-only audit. No source files were modified except this document.*
