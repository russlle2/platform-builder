# Stripe fulfillment queue runbook

## Launch architecture

1. `/api/stripe/webhook` reads the raw request and verifies the Stripe signature.
2. The verified event is inserted into `stripe_webhook_events` with its replayable JSON payload and a resource-level `business_key`.
3. Only after that durable insert, the route invokes `stripe-fulfillment` with the opaque event ID and a private bearer secret. Netlify returns `202` immediately.
4. The background worker atomically leases the row. A partial unique index permits only one processing event for a checkout or subscription at a time.
5. The worker performs payment-state updates, site creation/deployment, branded-host TLS/HTML verification, portal persistence, and email delivery.
6. Failures receive exponential backoff. `stripe-fulfillment-sweeper` redispatches due and lease-expired work every five minutes. Attempt 8 is retained as a dead letter.

The queue payload and all operational tables are service-role-only with RLS enabled. Successful jobs scrub their full event payload; failed/dead-letter jobs retain it only for recovery. The internal worker accepts only `POST`, validates a constant-time bearer credential, and has a code-based Netlify rate limit.

## Required configuration

- Apply `apps/generator-app/supabase/migrations/20260903000000_launch_transaction_hardening.sql` in the dedicated DailyClarity Supabase project.
- Set `STRIPE_FULFILLMENT_WORKER_SECRET` to an independently generated value of at least 32 random bytes (`openssl rand -hex 32`).
- Set the existing Stripe, Supabase, Netlify, Postmark, portal-signing, domain, and price variables documented in `.env.example`.
- Keep the Stripe webhook endpoint pinned to the app's documented API version and subscribed to every event listed in `.env.example`.
- Confirm wildcard DNS and certificate issuance for `*.PLATFORM_DOMAIN`; a purchase remains `provisioning_failed` until its exact branded URL serves HTML over HTTPS.

## Staging verification before live checkout

1. Deploy to an isolated staging Netlify site with Stripe test credentials and a staging-only Supabase project.
2. Confirm the Netlify Functions page identifies `stripe-fulfillment` as **Background** and `stripe-fulfillment-sweeper` as **Scheduled**. Scheduled functions do not run automatically on deploy previews, so use Netlify's **Run now** control for the recovery test.
3. Deliver signed test events covering paid checkout, trial/no-payment-required checkout, delayed payment success/failure, duplicate delivery, cancellation, payment failure, and out-of-order subscription events.
4. For each event, confirm the webhook responds quickly, then inspect `stripe_webhook_events`: `queued → processing → succeeded`. Verify duplicate delivery does not repeat site creation.
5. Force one worker failure, confirm `attempts`, `last_error`, and `next_attempt_at`, then confirm the sweep redispatches it. After fixing a dead letter, call the admin retry route shown below.
6. Complete a real test-mode purchase and verify the branded customer URL—not only its `netlify.app` fallback—has valid TLS, serves the expected site, and is the URL stored in `site_slugs`, `portal_sites`, and the customer email.
7. Confirm Postmark sender/domain verification and receive both purchase emails. Review Stripe Tax registrations and collection requirements separately before charging customers; this change does not enable automatic tax.
8. Exercise image fulfillment with a valid draft session, an expired cookie, and mixed draft owners. Invalid ownership must return `409` before any Stripe or checkout-intent write. Then force a retry after the first image copy and confirm the exact destination objects are reused successfully.

Useful operator query (run only with privileged database access):

```sql
select event_id, event_type, business_key, status, attempts,
       next_attempt_at, lease_expires_at, last_error, updated_at
from public.stripe_webhook_events
where status <> 'succeeded'
order by updated_at asc;
```

To replay a failed or dead-letter event after correcting the underlying issue:

```http
POST /api/admin/stripe/fulfillment/retry
Authorization: Bearer <INTERNAL_ADMIN_TOKEN>
Content-Type: application/json

{"eventId":"evt_..."}
```

## Failure semantics and limits

- Netlify Background Functions run for up to 15 minutes and currently provide two platform retries. The database sweep is the durable recovery path after those retries.
- Transactional email is **at least once**, not mathematically exactly once. A process loss after Postmark accepts a message but before its database marker commits can produce a duplicate. Postmark does not provide a send idempotency key that can close that distributed-commit window.
- Draft image sources are retained so delayed and repeated fulfillment stays recoverable; the worker copies only referenced objects and can also resume from an exact destination object written by an earlier attempt. Do not introduce draft-image cleanup until it is keyed to terminal fulfillment state plus a documented retention window. Until that cleanup exists, abandoned draft objects can accumulate storage.
- A successful local function bundle proves packaging and static configuration only. It does not prove production credentials, Stripe delivery, Supabase grants, Netlify execution, DNS, TLS issuance, or Postmark deliverability.
- The migration was authored and statically reviewed here, but a clean migration replay requires Supabase CLI/Docker or a disposable connected project.

References: [Stripe webhook security](https://docs.stripe.com/webhooks), [Netlify Background Functions](https://docs.netlify.com/build/functions/background-functions/), [Netlify Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/), and [Netlify function rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).
