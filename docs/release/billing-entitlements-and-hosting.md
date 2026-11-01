# Billing entitlement and hosting release controls

The Basic subscription is $20 per month. Hosting, editing, delivery and contact email are bundled; provider fees remain platform expenses. The usage allowance migration controls new billable side effects. There is no metered customer overage charge in this implementation.

## Implemented evidence and recovery

- Apply `20261029183330_enforce_site_usage_allowances.sql` and `20261029183355_customer_hosting_entitlements.sql` before deploying the corresponding routes and workers. Neither migration has been applied remotely by this source change.
- Keep the certified `launch_schema_readiness` version `20260903.4` and `booking_kit_schema_version` `20260925.2`. The release gate additionally requires `billing_lifecycle_schema_readiness` and `site_usage_schema_readiness` to report `20261029.1` and `ready: true`.
- A paid interval requires the current bound Stripe subscription and its settled latest invoice. Customer, subscription, environment, plan price, subscription item, quantity and full recurring period must match. A zero-payment invoice covered by an authorized discount or credit is legitimate access. Positive cash receipts remain separate accounting evidence.
- Trial access requires the current subscription to be trialing, with a verified start and end. An active subscription's `current_period_end` alone is not payment proof.
- A current cancellation/delinquency blocks new publishing, image uploads and contact emails through the shared entitlement contract. Dashboard, history and billing access remain readable. Existing paid intervals are retained as evidence. Ending at the paid period boundary keeps the active paid interval until it expires.
- Every five minutes, `hosting-reconciliation-sweeper` dispatches a private background worker. It processes at most 20 records, four at a time, and reserves selected rows for retry so malformed records cannot starve later customers. Per-record leases and generations reject stale provider responses.
- Webhook billing changes and reconciliation use the same portal-then-entitlement lock order. A captured billing snapshot prevents an active read started before cancellation from overwriting the cancellation. Unknown provider results preserve prior coverage and do not become suspension evidence.

Runtime settings are the existing application origin, `NEXT_PUBLIC_SUPABASE_URL`, `DAILYCLARITY_SUPABASE_PROJECT_REF`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_FULFILLMENT_WORKER_SECRET` (at least 32 characters), and the Stripe Price ID for each subscribed plan. Staging accepts test Stripe keys only. Production requires production mode and a live key. Credentials are never logged.

## Hosting suspension is deliberately inactive

`netlify-hosting-control.ts` is a guarded adapter, not an activated automatic suspension worker. It requires exact site/account/domain/deployment binding, a durable journal committed before the provider mutation, and a readback observer established on a task-owned fixture. No undocumented Netlify Site.state value is treated as suspension proof.

Before connecting that adapter to customer records:

1. Use an isolated site owned by the task and the intended Netlify account. Preserve its deployment and verify its public content.
2. Exercise the documented reversible `PUT /sites/{id}/disable?reason=...` and `PUT /sites/{id}/enable` operations. Verify public serving behavior and API readback after each operation, including propagation delay.
3. Record the actual readback contract and fixture evidence. Implement that observer; the current source intentionally supplies none.
4. Add transactional operation claiming tied to the current entitlement generation and exact stored site binding. A fresh terminal observation with a known expired interval is required for suspension. Unknown state, provider outages, future paid coverage, or missing evidence require review.
5. Test crashes/timeouts before the request, after provider acceptance, and before journal completion. Unknown outcomes must remain reviewable and cannot authorize automatic restoration. Restore only this platform's latest confirmed suspension. Provider usage/spam suspensions must not be overridden.
6. Test cancellation, paid-through continuity, payment recovery, and restoration using Stripe test mode and the isolated provider fixture before activating a production worker.

Disabling Netlify serving does not delete site data. Public Supabase asset URLs can continue to generate storage/egress costs; no customer image deletion is included. Account budgets, asset-delivery controls and provider plan costs still require verification before advertising unlimited traffic or zero marginal cost.

## Validation

Focused Vitest suites cover invoice/trial identity and period evidence, zero-payment discounts, canceled subscription handling, provider failure fencing, dispatcher configuration, adapter activation, target binding, journal-before-request ordering, and ambiguous provider outcomes. The full migration replay includes service-role lifecycle tests and keeps legacy schema versions unchanged. The SQL race test explicitly interleaves a claim, cancellation and delayed completion; it is not a multi-connection production load test.
