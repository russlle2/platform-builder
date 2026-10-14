# DailyClarity launch readiness — 14 October 2026

The existing website is reachable, but the hardened application in this branch is **not yet verified for production sales**. A zero-real-dollar PayPal Sandbox exercise is a separate, achievable test; follow [the trial guide](PAYPAL_ZERO_DOLLAR_TRIAL.md). Completing that exercise does not attest production fulfillment, delivery email, DNS, or the full template catalogue.

This audit used repository files, public website assets, GitHub workflow/deployment metadata, Supabase schema/privilege metadata, and value-free readiness functions. It did not read customer records, alter either database, change provider configuration, or publish a production deployment.

## Verified identities and state

| Component | Observed state | Meaning |
| --- | --- | --- |
| Repository | [russlle2/platform-builder](https://github.com/russlle2/platform-builder) | The username is `russlle2`. |
| Audit baseline | PR #19 branch `codex/legacy-catalog-rehab-20260903`, commit `58fa93689c6c51df642cb634e017760efa8f9240` | This is ahead of the default branch; local improvements are not proof of live deployment. |
| Default branch at audit | `main`, commit `bf3801d180109256ff73c14b7a4b7e0bd7dccff8`, dated 13 July 2026 | The current protected release workflow is not yet the workflow on `main`. |
| Public site/database identity | The `/login` and `/dashboard` browser bundles on `https://dailyclarity.org` embed `https://psxmvaushwsboogfnyqi.supabase.co` | This directly identifies the browser's live Supabase project; no server credential was exposed or retrieved. |
| Live-bound Supabase project | `psxmvaushwsboogfnyqi`, named `russlle2's Project`, `ACTIVE_HEALTHY` | Contains older DailyClarity tables and unrelated `hunter_*` tables. It is not a proven dedicated launch database. |
| Staging Supabase project | `yuviqftugmasjypkhrpo`, named `DailyClarity Staging 2026-09-03`, `ACTIVE_HEALTHY` | Separate project, with the hardened schema already present. |
| Staging schema probe | `launch_schema_readiness()` returned `{"ready":true,"schemaVersion":"20260903.4"}`; `booking_kit_schema_version()` returned `20260925.2` | Schema passes through the management SQL connection. The deployed application's own secret and Data API access still need the authenticated runtime probe. |
| Staging readiness RPC grants | `service_role` can execute both functions; `anon` and `authenticated` cannot | Matches the intended server-only readiness checks. |

## Concrete blockers and shortest next actions

| Priority | Blocker | Next action |
| --- | --- | --- |
| 1 | No PayPal Sandbox client ID/secret was available to this execution. | Use a free PayPal Sandbox REST app and separate sandbox buyer account with the local trial guide. Never substitute a live PayPal credential or real card. This does not require Netlify, Supabase, Stripe, or email setup. |
| 1 | The live-bound database lacks `checkout_intents`, `stripe_webhook_events`, the Booking Kit tables, and both schema readiness RPCs. | Establish the intended dedicated production database and migration plan before deploying this branch. Review the existing shared-project consumers and grants before any migration there; migration history differs from this repository and some hardening changes alter default privileges. |
| 1 | Protected staging rejected the existing feature branch. | In GitHub's `staging` environment, permit the reviewed release branch or use an already permitted reviewed branch. Then run the isolated staging publication workflow against its own Netlify site and database. Do not remove site/database identity checks. |
| 1 | Netlify runtime credentials/configuration and GitHub protected environment secrets were not accessible for verification. | With account access, verify the values specified below, deploy staging, and run `verify-deployed-runtime.mjs`. A Supabase management connection is not a substitute for the deployment's runtime credential. |
| 1 | Full catalogue certification and connected purchase/fulfillment evidence are required by this release path. | Complete [the template audit](TEMPLATE_AUDIT_2026-10-14.md) and retain the exact 5,486-template certification bundle plus connected staging evidence. The 60-template curated baseline does not satisfy the certified promotion contract. |
| 2 | The protected production workflow requires the exact reviewed commit on `main` and successful push CI for that SHA. | After staging evidence is complete, merge the reviewed release, pass main CI, and use the verified certification artifact with `.github/workflows/deploy.yml`. Its write confirmation is `PROMOTE CERTIFIED`, not the older README's `DEPLOY`. |
| 2 | Stripe delivery, Netlify provisioning, email receipt, recovery/refunds, preview editing, and rollback have no new connected proof in this audit. | Exercise and retain each result on isolated staging using the existing runbooks. Keep Booking Kit sales disabled until its own gates pass. |

The available evidence does not support a guaranteed production launch by 15 October. The local PayPal Sandbox trial can be completed independently while the production prerequisites are resolved.

## Release gate bug repaired in this change

The production dependency audit initially found six advisories. Next.js was patched to `15.5.27`, Sharp to `0.35.5`, `postcss-selector-parser` to `7.1.6`, and transitive `source-map-js` to `1.2.2`. The frozen lockfile installs and `pnpm audit --prod --audit-level moderate` reports no known vulnerabilities. CI now runs that audit. The selector-parser upgrade crosses its major version because no patched 6.x release was available; its type check and focused browser regressions passed. This changes the compiler dependency fingerprint, so old original-corpus browser receipts cannot certify the new dependency set.

The latest migration and application expected schema `20260903.4`, and staging actually returned that version. Three release scripts still required `20260903.3`, so they would reject the correctly migrated database:

- `apps/generator-app/scripts/verify-launch-schema.mjs`
- `apps/generator-app/scripts/deployed-runtime-contract.mjs`
- `apps/generator-app/scripts/certified-catalog-release.mjs`

All three now require `20260903.4`; the Booking Kit requirement stays `20260925.2`. The runbook has been corrected. Historical migration tests still intentionally exercise earlier schema versions.

Validation: `node apps/generator-app/scripts/verify-launch-schema.test.mjs` passed six tests, including current schema acceptance, old/incomplete schema rejection, missing payment-evidence rejection, provider failure, origin pinning before credentials are sent, and missing credentials. `node apps/generator-app/scripts/certified-catalog-release.test.mjs` passed 13 tests, including rejection of the old runtime schema. These are local tests, not a provider purchase or production deployment.

## GitHub evidence

- [Latest baseline PR CI](https://github.com/russlle2/platform-builder/actions/runs/36197271682) succeeded on 25 September for `58fa93689c6c51df642cb634e017760efa8f9240`.
- [Staging publication attempt](https://github.com/russlle2/platform-builder/actions/runs/36110095574) failed before any job steps ran. Its annotation states: `Branch "codex/legacy-catalog-rehab-20260903" is not allowed to deploy to staging due to environment protection rules.` This is observed protection failure; an older document's billing concern is not evidence of a current billing failure.
- [Last recorded production Deploy run](https://github.com/russlle2/platform-builder/actions/runs/29217053026) succeeded on 13 July for the current old `main` SHA. It does not prove deployment of the hardened September branch or this change.
- No runs were returned for the existing Full Funnel E2E workflow. The new `deploy-staging.yml` was absent from the default branch workflow inventory at audit time.
- A GitHub deployment record proves that GitHub tracked a deployment attempt. It does not alone prove the live Netlify commit, domain ownership, or runtime settings; the repository's Netlify attestation is still required.

## Supabase advisory review

Both projects have RLS enabled on every returned `public` table. RLS-enabled tables without browser policies are expected for the server-only queues, private orders, drafts, and intake records; adding permissive policies to silence informational notices would weaken the design.

The live-bound project has anonymous and authenticated grants on `accounts` and `intake_contacts`, producing [anonymous GraphQL schema visibility](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed) and [authenticated schema visibility](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed) warnings. This is object discovery, not demonstrated row leakage: the observed account read policy requires `auth.uid() = id`, and intake has no browser policy. The existing hardened migration narrows these grants. Validate that migration against the intended project and its consumers before applying it.

Staging returned no table-exposure warnings. Its browser grants are restricted to authenticated account/portal reads and validated booking/newsletter inserts. The advisor also reports [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); availability depends on the project's plan. This does not block a local PayPal Sandbox exercise, and no paid upgrade was initiated.

## Runtime configuration to verify with provider access

Use the existing `staging` project; do not incur charges creating another project merely to run the local trial.

1. The staging Netlify site must match the protected GitHub variables `NETLIFY_EXPECTED_SITE_ID`, `NETLIFY_EXPECTED_SITE_HOSTNAME`, and `NETLIFY_EXPECTED_ACCOUNT_SLUG` and must differ from production site `4a98d266-bb9f-44ab-bf27-30597d741705`.
2. `STAGING_SUPABASE_URL` and `STAGING_SUPABASE_PROJECT_REF` must identify `yuviqftugmasjypkhrpo`; the environment secret `STAGING_SUPABASE_SERVICE_ROLE_KEY` must belong to it. The app uses the corresponding `NEXT_PUBLIC_SUPABASE_URL`, `DAILYCLARITY_SUPABASE_PROJECT_REF`, and server-only `SUPABASE_SERVICE_ROLE_KEY`.
3. The staging deployment must set `DAILYCLARITY_ENVIRONMENT=staging`, have the matching `INTERNAL_ADMIN_TOKEN`, and expose the actual reviewed `NEXT_PUBLIC_RELEASE_SHA`. The catalogue profile and immutable hashes must match the chosen reviewed staging artifact.
4. Run the repository's schema check, Netlify identity check, and authenticated deployed-runtime check. Then exercise the configured Stripe test integration, its authenticated fulfillment worker, customer site provisioning, and actual email delivery.
5. Record connected results and preserve the previous deployment/catalogue pointer before the certified production promotion. See [the certified release runbook](CERTIFIED_CATALOGUE_RELEASE.md) and [fulfillment runbook](STRIPE_FULFILLMENT_RUNBOOK.md).

No production schema changes, new paid resources, real-money purchases, or deployment claims are included in this readiness report.
