# Platform Builder — Template Overhaul & Launch Handoff

> Living handoff/context doc. Lets a fresh session or subagent continue without re-reading the
> whole chat. Update the "Status" markers as work proceeds. Last updated: 2026-05-28.

## 1. Project shape

- Repo root: `c:\Users\chris\platform-builder` (git repo, remote `russlle2/platform-builder`, branch `main` @ `029c7850`).
- App: `apps/generator-app` — Next.js (App Router), deployed on Netlify.
- Environment is **Windows / PowerShell**: chain with `;`, avoid `head`/`cat`/`grep`/`sed`. `node_modules` installed.
  Build: `npm run build` (in `apps/generator-app`), ~9s compile + static gen.
- NOTE: the filesystem layer is occasionally flaky — `Get-ChildItem` / search tools intermittently throw
  "cannot find the path specified (os error 3)" and a file Write may report success without landing.
  Verify writes with `[System.IO.Directory]::GetFileSystemEntries(...)` or `git status`, and retry if needed.
- Live customer site: **dailyclarity.org** → Netlify project `keen-buttercream-c3c10a` (id `4a98d266-bb9f-44ab-bf27-30597d741705`).
  Secondary `hvac.dailyclarity.org` → project `platformbuilder` (id `9ca9b578-e26f-4a32-84f3-73ab6b6e9320`).
  Netlify account id `6974219b1ab3798c7aed8c8a`.

## 2. Template system architecture (READ FIRST)

- Templates are **on-disk folders**: `c:\Users\chris\platform-builder\platform-builder\<niche>\<template-dir>\`
  (nested `platform-builder/` inside the repo). Whole tree is git-tracked (~14k files).
- Resolved at runtime by `apps/generator-app/src/lib/templates/niche-registry.ts`
  (`TEMPLATES_ROOT = path.join(process.cwd(), '..', '..', 'platform-builder')`).
- Each template dir: `index.html` (+ other `.html` pages), `template.json` (meta), `fields.json` (field schema), assets.
- `template.json`: `{ name, slug, layoutFamily, voiceFamily, programModel|offerModel, requiredSections, placeholders:[...], description?, order? }`.
  **`slug` is the routing key — NEVER change it.**
- Copy lives inside `.html`; `{{TOKENS}}` are placeholders hydrated by `hydrateTemplate()`.
- **Niches = categories.** Active set in `NICHE_META` (niche-registry.ts):
  `aromatherapy, holistic_medicine, private_practice_therapist, sound_bath, wellness_coach` (HVAC deactivated).
  Inactive folders also exist on disk: `hvac`, `dental`, `injury_law` (not in NICHE_META).
- Category browsing is **data-driven** from `getNiches()`/`NICHE_META`:
  - `/templates` gallery → `app/templates/page.tsx`
  - `/<niche>` landing → `app/[niche]/page.tsx` (`notFound()` if not in NICHE_META)
  - `/templates/<niche>` grid → `app/templates/[niche]/page.tsx` + `GalleryGrid.tsx`
  - `/templates/<niche>/<slug>` customize+preview → `app/templates/[niche]/[slug]/page.tsx`
  - Homepage industry cards → `app/page.tsx` `#niches`
  - Business intake niche picker → `app/preview-your-business/page.tsx` `NICHE_OPTIONS` (HARD-CODED; keep synced with NICHE_META).
- Customize flow: customize page fetches `/api/templates/[niche]/[slug]` (fields) → paginated form (`groupFieldsIntoPages`)
  → POST `/api/templates/[niche]/[slug]/preview` hydrates HTML in iframe. Iframe supports double-click inline text edit +
  click-to-swap images + link nav, but those edits are **preview-only / NOT persisted**. Purchase: `/pricing?template=&niche=`
  → Stripe checkout → webhook provisions.

## 3. Work COMPLETED

### Launch / payments
- PR #13 squash-merged to `main` (`029c7850`); local main synced.
- Stripe (live acct "Daily Clarity" `acct_1SrrqZ9AeloaKLwt`): Basic `price_1Sy3KA9AeloaKLwt3bc3mEay` $20/mo;
  Growth `price_1Sy3LF9AeloaKLwtjXQZjrRN` $80/mo (product "Security + Ads" `prod_TvvBVJQdasnCQL`). Both active/livemode.
  Both `tax_behavior=inclusive` (Growth changed from unspecified — **permanent**).
- Netlify: copied Stripe/email/db env to `platformbuilder` site + set live `STRIPE_SECRET_KEY` (Netlify masks secrets on read).
  Checkout verified `cs_live_...` on both dailyclarity.org and hvac.dailyclarity.org.
- Pricing reworked (`app/pricing/PricingClient.tsx`): Basic = auto-deliverable only; Growth = superset + 2 light-manual items.

### Template fixes
- **HVAC deactivated**: `hvac` commented out in `NICHE_META`; removed from `preview-your-business` `NICHE_OPTIONS`;
  default niche `'hvac'`→`'wellness_coach'`. Build shows only 5 niches. HVAC folder still on disk (reversible).
  NOT done: site-wide HVAC branding (nav "HVAC Pro", hero copy), legacy `/wizard` (HVAC-only).
- **"0 fields" bug FIXED** in `niche-registry.ts`: root cause was object-map `fields.json` (`{ "fields": { KEY: "string" } }`)
  unhandled by `parseFields` (only handled array). Added Format C2 (object-map) + helpers (`inferType`, `fieldFromMapEntry`,
  `dedupeFields`, `fieldsFromPlaceholders`, `fieldsFromHtml`, `TYPE_KEYWORDS`) + fallback chain in `parseTemplateMeta`
  (fields.json → template.json placeholders → {{TOKENS}} in index.html → dedupe). Verified **100% of 554 templates** resolve fields (avg ~9).
- **Large-scale normalization DONE** via `apps/generator-app/scripts/normalize-templates.mjs` (idempotent; `--report`, `--dry-run`):
  rewrote **554** `template.json` across 5 active niches with unique human `name` (`<Voice> · <Layout> — <hero phrase>`),
  short `description`, and interleaved `order` (round-robin by layoutFamily). `niche-registry.ts`: added `order` to
  `TemplateMeta`, `ensureCache` sorts each niche by `order`. Validation: 0 missing names / 0 dup names / 0 dup snippets per niche.
  Build PASS. 0 index.html edits needed. Idempotent (re-run rewrites 0). hvac untouched.

> NOT committed yet (user has not asked). Working-tree changes: `niche-registry.ts`, `preview-your-business/page.tsx`,
> `pricing/PricingClient.tsx`, 554 `template.json`, new `apps/generator-app/scripts/normalize-templates.mjs`.
> (Stripe + Netlify changes are remote/live.)

## 4. REMAINING WORK — plan

### FINAL (do last, per user): optimize pre/post-purchase customization
- **Pre-purchase universal intake** (user explicitly likes this): broaden the one business-info intake
  (`preview-your-business` saves `pb_biz_info` to sessionStorage; customize page maps it onto fields ~lines 206-226 of
  `templates/[niche]/[slug]/page.tsx`) so ALL templates pre-populate from a single intake. Centralize the
  universal→placeholder mapping (currently a hard-coded map). Consider a shared `lib` module mapping common business
  fields (name, owner, email, phone, address, tagline, services, hours, city/state, CTA) to the union of placeholder
  conventions used across templates.
- **Post-purchase (emphasized)**: today inline iframe edits are NOT persisted; there is a `/portal` and `/editor`.
  Build a real saved-customization model: persist field values + inline text/image edits (Supabase), let buyers
  re-edit and re-publish after purchase. Biggest UX piece — design after the rest lands. Files: `app/portal/PortalClient.tsx`,
  `app/editor`, `store/previewStore.ts`, `api/stripe/webhook`, `api/sites/provision`.

## 5. Gotchas
- Keep `preview-your-business` `NICHE_OPTIONS` synced with `NICHE_META`.
- `slug` is the routing key — never change during renames.
- `container-hvac` is a CSS layout class used everywhere — NOT a niche reference; do not remove.
- Netlify masks secret env values on API read (returns empty) — set secrets explicitly, don't copy.
- Build is the cheapest full validation. For field/coverage checks, a throwaway `node scripts/*.mjs` replica works.
- Filesystem layer is flaky (see §1) — verify writes landed.
