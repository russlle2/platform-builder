# Scoped DailyClarity production schema reconciliation

Applied and verified 15 October 2026 for **`psxmvaushwsboogfnyqi` only**. The root agent applied the exact reviewed SQL after rehearsal and review; the builder itself has no database connection or credentials. The separate confirmed-email trigger correction was applied to staging.

## Evidence and scope

Read-only catalogue queries confirmed that the live-bound project contains unrelated `hunter_*` tables and permissive legacy default grants. `service_role` already has public-schema usage without create permission. There are no existing non-internal Auth or DailyClarity table triggers, and no incoming foreign keys to `draft_profiles`. The application tables have the old schema plus the previously reconciled order columns.

Value-free preflight checks confirmed existing draft rows, no portal/order/manual-task rows, and no duplicate case-insensitive custom domains or checkout session IDs. No customer record contents were read or copied. The migration must preserve the draft rows; dropping or resetting the project is unnecessary.

The application reads `portal_sites` through verified Auth identity. `dashboard/page.tsx` and `portal-owner-auth.ts` call `auth.getUser()`; the updated claim helper requires the trusted `email_confirmed_at` field before binding an unclaimed site by email. An authenticated session or user-editable metadata alone cannot claim ownership. Already-owned access continues to use the immutable Auth ID, including after email changes. Runtime application code does not query the `accounts` table. Therefore the shared-project adaptation omits the canonical migration's project-wide Auth signup trigger and bulk import of all Auth users into DailyClarity accounts. It retains the scoped existing-portal ownership backfill, owner-id access policy, portal-token expiry, and authenticated runtime ownership checks. Existing Auth triggers and account rows remain unchanged.

Read-only requests to both projects' `/auth/v1/settings` on 15 October returned `mailer_autoconfirm=false`, `phone_autoconfirm=false`, `disable_signup=false`, and `external.email=true`. This verifies the current email-confirmation setting directly; signup availability alone would not establish it. No users were created and no verification email was sent. These public Auth settings do not expose custom SMTP configuration or establish successful email delivery.

## Candidate implementation

`apps/generator-app/scripts/shared-project-reconciliation.mjs` builds one atomic operation from these existing migrations, in order:

1. `20260903000000_launch_transaction_hardening.sql`
2. `20260903230900_harden_service_role_data_api_grants.sql`
3. `20260925071341_booking_kit_private_orders.sql`
4. `20260925072106_booking_kit_measurement.sql`
5. `20260925222534_booking_inquiry_cleanup_filter_privilege.sql`
6. `20260925222605_attest_booking_inquiry_cleanup_filter.sql`

The bounded adaptations are:

- Omit `sync_auth_user_account`, its `auth.users` trigger, and the import of unrelated Auth users into `accounts`. Restrict the subsequent portal ownership backfill to Auth users with non-null `email_confirmed_at`, while preserving existing owner IDs and access policies.
- Omit all `ALTER DEFAULT PRIVILEGES` statements and schema-wide grant/revoke statements. Verify the existing schema privileges instead of changing them.
- Explicitly revoke inherited `service_role` privileges on the three newly introduced Booking Kit tables before granting their required CRUD access. Preserving global defaults otherwise leaves inherited `TRUNCATE`, `REFERENCES`, and `TRIGGER` privileges behind.
- Leave unrelated tables, policies, functions, sequences, Auth triggers, and storage configuration unchanged. Retain app-owned sequence normalization and exact application table/RPC grants.

No historical migration files are edited. The builder includes each source migration's SHA-256 in the candidate and refuses ambiguous transformation boundaries. A reviewed SQL file can be regenerated outside the normal canonical migration history:

```sh
node apps/generator-app/scripts/shared-project-reconciliation.mjs \
  --project-ref psxmvaushwsboogfnyqi \
  --output /absolute/new-review-file.sql
```

The command creates a new file exclusively and refuses to overwrite one. It cannot apply SQL. Supabase CLI `2.120.0` issued the updated review filename `20261015004154_reconcile_dailyclarity_confirmed_ownership.sql` in `/workspace/shared-schema-review/supabase/migrations/`; the exact candidate and `confirmed-ownership-receipt.json` are retained there. Its SHA-256 is `f4411b685b51dde5243842f29fa2f52d702952a1d5f746b26b582ce234f697a6`. This candidate supersedes the initial `20261015003333` candidate, which did not require confirmed email in the backfill and must not be applied.

The separate additive canonical migration `20261015004242_require_confirmed_email_for_portal_claims.sql` hardens the existing Auth account-sync trigger on dedicated installations. It preserves account synchronization, requires confirmed email for new portal claims, and also runs when email confirmation changes. It does nothing when that canonical function is absent, so it cannot install a project-wide Auth trigger on this shared production project. Before correction, read-only staging metadata confirmed its older canonical function claimed without confirmation; no staging portal was linked to an unconfirmed Auth owner. The full canonical migration replay tests the fix, while the shared-project rehearsal verifies that applying it leaves shared Auth behavior unchanged.

## Applied evidence

| Project | Applied history version and name | Reviewed SQL SHA-256 |
| --- | --- | --- |
| Production `psxmvaushwsboogfnyqi` | `20261015004343` / `reconcile_dailyclarity_confirmed_ownership` | `f4411b685b51dde5243842f29fa2f52d702952a1d5f746b26b582ce234f697a6` |
| Staging `yuviqftugmasjypkhrpo` | `20261015004404` / `require_confirmed_email_for_portal_claims` | `6219320d0097cdcffdfc2e8e8931a1e35d6c6efe03709b5b05b012e4c25039e8` |

The provider assigned the history versions when applying the migrations; they differ from the CLI-generated review filenames above. The root agent verified that the unrelated metadata fingerprint and existing draft-content fingerprint were identical before and after the production transaction. Independent read-only postchecks confirmed:

- Both projects return launch readiness `{ready:true,schemaVersion:"20260903.4"}` and Booking Kit schema `20260925.2`.
- Production retains its existing draft row with a non-null UUID; it has no `sync_auth_user_account()` function or non-internal `auth.users` triggers.
- Production orders, checkout intents, webhook events, and all three Booking Kit tables have RLS, no browser CRUD grants, and no service-role `TRUNCATE`, `REFERENCES`, or `TRIGGER` grants.
- Launch/Booking schema functions, checkout upsert, payment recording, and Booking Kit fulfillment permit `service_role` execution and deny `anon`/`authenticated` execution.
- Staging's canonical function requires `new.email_confirmed_at IS NOT NULL`; its trigger listens to inserts and changes to `email` or `email_confirmed_at`. Browser execution remains denied.

Security advisors retain the expected no-policy information for service-only tables and disabled leaked-password-protection warning. Production also flags authenticated GraphQL visibility for the owner-filtered accounts/portal tables; their RLS policies remain the intended ownership boundary. Auth settings affect other consumers of the shared project and were not changed blindly.

Performance advisors identified two equivalent unique indexes on `orders.stripe_session_id`. `orders_stripe_session_id_key` backs the existing unique constraint; `orders_stripe_session_unique_idx` has no owning constraint, but the current launch sentinel explicitly requires its name. Neither was dropped. A later cleanup should first make the sentinel attest equivalent unique-index semantics, then remove the redundant nonconstraint index while retaining the original constraint. This does not block the now-passing schema checks.

## Transaction, preservation checks, and rollback

The SQL begins a transaction, sets a five-second lock timeout and 90-second statement timeout, and locks only the existing application tables against concurrent writes. Duplicate domains/orders and dependent draft foreign keys fail before the associated incompatible alteration. Existing draft email/profile rows receive UUIDs and retain their contents; UUIDs remain stable on replay.

Before changes, a temporary guard stores **metadata only**: default privileges, public-schema ACL, Auth trigger definitions, unrelated public function definitions/ACLs, and unrelated relation/sequence ACLs and RLS flags. The transaction compares these with the final metadata and aborts if any change. Its last checks require both real readiness sentinels, RLS on private order tables, and no unintended browser or broad service-role privileges on those tables.

A failed statement leaves the transaction aborted: issue `ROLLBACK` rather than retrying individual statements. No intermediate change should be committed. When using a migration runner that supplies its own transaction, preserve the entire body, settings, guards, and postconditions within that runner's transaction; do not split it into six provider calls. Record the operation once in the target project's migration history using the reviewed migration name and retained source digests. Do not mark the six original versions as individually applied or replay the entire canonical history on this shared project.

There is deliberately no automatic destructive down migration after commit. Reverting the draft UUID primary key to email can lose valid newer drafts with matching emails; reverting order grants to support the old app weakens the payment write boundary. Retain the current application release and fix forward if a post-deployment issue is discovered. Any after-commit rollback requires a separately reviewed plan preserving all new draft/order state; an application-only rollback to the pre-hardening release is not sufficient.

## Rehearsal and final checks

Run:

```sh
node apps/generator-app/scripts/shared-project-reconciliation.pglite.test.mjs
```

Five local tests passed. They replay real prelaunch migrations with the observed legacy column differences, existing draft and portal fixtures, permissive shared default grants, an unrelated application table/sequence, and an unrelated Auth signup trigger. They verify:

- Existing drafts, accounts, portal credentials, and unrelated rows are preserved; portal ownership binds only to an email-confirmed identity, skips unconfirmed users on replay, and never reassigns an already-owned portal after an email change.
- Both sentinels pass with the intended versions and service-only access; real checkout/order-payment RPCs work under `service_role`.
- Unrelated Auth signup behavior and future table/sequence grants survive; the new Booking Kit tables receive only their intended permissions.
- A duplicate-domain failure rolls back schema changes, unsafe schema privileges fail before writes, and a deliberately injected late unrelated ACL change aborts and rolls back the entire operation.
- Replaying the candidate preserves draft UUIDs and readiness.

Seven focused runtime ownership tests also pass: unconfirmed claims and forged user metadata are rejected, confirmed matching emails can claim only unowned sites, immutable owners retain access after email changes, other owners remain excluded, and authentication/database failures fail closed.

Both sentinels, preservation fingerprints, and Supabase advisors have been checked after application. The remaining deployment-level checks are `verify-launch-schema.mjs` using the hosting deployment's own service credential and `verify-deployed-runtime.mjs` against the intended deployed app. A management SQL probe alone does not establish that the hosting provider has the correct secret. This schema repair does not establish Stripe credentials, email delivery, connected fulfillment, catalogue certification, or production deployment readiness by itself.

Supabase references: [Data API privilege boundaries](https://supabase.com/docs/guides/api/securing-your-api), [database migrations](https://supabase.com/docs/guides/deployment/database-migrations).
