# Booking Clarity Kit

The kit is deterministic, versioned composition for one service in the existing five niches. It costs $9 USD once, is served at `/booking-kit`, and never reserves a website slug or provisions hosting. `BOOKING_KIT_ENABLED=false` is the default. The existing free website preview remains available.

## Configuration and staging

Apply both Booking Kit migrations after the existing launch migrations, even while kit sales are disabled: the shared website worker also records durable positive-payment evidence. The combined deployment gate requires website schema `20260903.3` and kit/payment-evidence schema `20260925.2`. The private tables enable RLS and revoke all browser-role access. The server requires the pinned Supabase project, `PORTAL_TOKEN_SECRET` of at least 32 characters for durable recovery limits, the existing fulfillment worker secret, and Postmark configuration.

Set `STRIPE_PRICE_BOOKING_KIT` to an active one-time USD 900-cent price in the intended Stripe account and mode. The route retrieves and validates this price before checkout. Use `DAILYCLARITY_ENVIRONMENT=staging` with a Stripe test key on the isolated staging site. Production requires its explicit environment identity and a live key. Do not enable production sales before the release gates below pass.

The webhook must receive `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `refund.created`, and `refund.updated` in addition to existing subscription events. The durable queue and worker process kit events; the payment success page does not fulfill purchases.

Artifacts and normalized supplied facts are saved before checkout. Current authoritative Stripe objects must match the saved order, session, price, quantity, amount, currency and payment intent. The verified Checkout email becomes the purchase email atomically, including when the buyer corrects the prefilled address. Order transitions lock the row and do not reactivate refunds. Hosted entitlement lasts 90 days from the signed paid event timestamp; recovery links last one hour. An earlier unpaid event cannot grant access merely because the session later becomes paid. Only token hashes are stored. Email delivery failures leave the paid browser entitlement intact and enter the existing retry path. Recovery sends transactional access links with tracking disabled.

## Verification before sales

- Run `corepack pnpm install --frozen-lockfile`, then install Chromium before tests: `corepack pnpm --filter @platform-builder/generator-app exec playwright install chromium`.
- Run `corepack pnpm validate`. The root test command includes empty-database replay and private-order SQL state/access regressions.
- Start the local app and run `corepack pnpm --filter @platform-builder/generator-app exec playwright test e2e/public-routes.spec.ts e2e/booking-kit.spec.ts` with an explicit local `BASE_URL`. Browser kit delivery fixtures prove UI behavior, not Stripe or email integration.
- On isolated staging, complete an actual Stripe test checkout and receive the transactional email. Verify delayed/unpaid/failed, duplicate and reordered events; expired/wrong credentials; refund revocation; recovery; and email failure/retry.
- Recheck the existing subscription and custom-build flows, website provisioning, branded HTTPS, customer portal, cancellation, and received email.
- Complete certification of all 5,486 legacy slugs with current hashes, final desktop/mobile/customization receipts, and verified canonical or supported alias mappings. Neutral fallback designs cannot satisfy this gate.
- Promote only the exact tested commit and immutable certified catalogue. Record and retain the previous deployment and catalogue pointer for rollback. Local tests and a passing pilot cannot authorize production.

## First 25 buyers

Run `node apps/generator-app/scripts/report-booking-kit.mjs` with the pinned HTTPS project URL/ref and server-side service-role credential. This read-only aggregate report selects the first 25 distinct buyers and includes their repeat completed kit purchases. It counts completed purchases, email delivery and failure outcomes, refunds, explicit preview transfers, and support minutes that have actually been entered. Support time is unknown until recorded; it is not assumed to be zero.

Record actual support effort in `booking_kit_orders.support_minutes` through an authorized server-side administration session. Record total minutes for the order; do not put support notes or customer facts into analytics. The report counts later Basic website purchases only with positive-payment evidence, and later paid custom builds. These match email and chronology and are observational follow-on purchases, not proof of attribution or conversion caused by the kit. Retain a separate record of any refunds/cancellations when interpreting revenue.

No automatic subscription, marketing sequence, advertising, outreach, Canva, or paid AI is part of this flow. The kit path offers Basic from the existing $20/month constant and the existing $500 custom build; the manually delivered $80 package is excluded from that path.
