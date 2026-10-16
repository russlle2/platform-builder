# Checkout confidence and payment recovery

This batch reduces avoidable checkout friction and misleading recovery messages. It does not remove issuer authentication, change Radar rules, or create live transactions.

## Changes

- A synchronous shared lock prevents competing plan requests and stays active through navigation to Stripe. The preview-to-plans handoff also ignores repeated clicks while saving its checkpoint. Definite failures remain retryable.
- A lost response or uncertain Stripe session-creation outcome gives a support reference where available and discourages a second payment attempt. The server retains the existing pending record and reserved site address for signed-event reconciliation. Recording uncertainty cannot overwrite a concurrently completed order.
- A recognized complete-but-unpaid Checkout session has an awaiting-payment display, never a paid/fulfilled result. Unverified confirmation offers a status refresh, dashboard, and support; it does not promote another purchase.
- Returning from Checkout does not assert that no charge occurred or that an existing subscription was canceled. Custom-build cancellation confirms draft restoration only when it actually restored a valid tab-scoped draft.
- Wallet copy matches dynamic eligible methods and the existing Link suppression. Stale-catalogue and expired-upload recovery give different instructions.
- Help explains the verified statement descriptor, bank approval, payment status and billing controls. Website ownership remains bound to the private DailyClarity account email, even if the Stripe billing email is edited. Payment-confirmation references are excluded from analytics, referrers and shared caching.
- Order emails no longer claim a build is in progress or promise a delivery ETA. Their domain-help links target the actual help section. Order and website-live messages include usable plain-text links and disable provider tracking of private editing credentials.

Existing guest checkout, minimal address collection, no additional phone collection, automatic 3DS, dynamic payment methods, signed webhooks and payment-gated fulfillment remain in place. Checkout creation itself is not a charge.

## What the account audit established

A read-only live Stripe settings check on 2026-10-16 verified:

- Charges are enabled and the card statement descriptor is `DAILYCLARITY.ORG`.
- A logo is configured. The default customer billing portal provides invoice history, payment-method updates and cancellation at period end, with correct policy URLs.
- The account description describes wellness coaching/products but omits the website offering. The owner confirmed that this account sells both websites and wellness products; any correction must retain both, rather than replace the wellness description. No business category change is inferred from this.
- The support-page URL and support email are absent. The available connector exposes retrieval, but no matching account-profile update operation. No settings were changed.

Separate DNS checks found no MX and no valid DMARC TXT response for the domain. Those observations do not prove every possible mail route fails, but a working domain support inbox and receive/reply delivery are not established. Do not publish an unverified mailbox as dependable support. Personal inboxes, physical addresses and account-sensitive settings are intentionally omitted here.

## Scope and remaining work

The client lock and uncertainty handling are not durable cross-request idempotency. Reloading, another tab or a newly submitted request can still create a new Checkout session. A future recovery protocol must bind an unpredictable attempt capability to the exact validated payload, persist provider parameters, reconcile/reuse the same session, and distinguish open/completed/expired attempts. Never deduplicate unrelated purchases solely by email. Pending uncertainty currently requires operator/provider reconciliation; do not describe it as automatic recovery.

Local fixtures establish UI and state behavior only. A connected test purchase, actual bank test challenge, received email and production publication require separate evidence. Follow `FULL_CATALOGUE_HANDOFF.md` against the final exact main SHA; never relabel an older certified catalogue or simulation as this release.

The owner confirmed this work is preventive: no customer warning has been observed or reported. Do not describe DailyClarity as having a diagnosed scam warning.

## Connected test matrix

Run only in the dedicated staging environment with Stripe test/sandbox credentials, current certified application and normal webhook/ownership gates. Use the two owner-authorized inboxes stored privately outside the repository. Do not run the synthetic test-purchase endpoint as proof of a real Stripe payment.

| Case | Required evidence |
| --- | --- |
| Successful subscription | Stripe test Session/payment, one bound intent/order/site, correct private owner, public contact email remains public-only, received application emails, verified-email sign-in, owned dashboard |
| Required authentication | Stripe's current documented 3DS test card; challenge success and canceled/failed challenge; no fulfillment before the required result |
| Decline and retry | Documented decline test card; intelligible provider message; no paid order/site for the decline; successful subsequent authorized attempt bound correctly |
| Asynchronous result | Pending UI before settlement, no paid fulfillment until the signed successful event, truthful handling of failure |
| Interrupted response | Preserve uncertain intent/reservation and support reference; reconcile the existing provider attempt before allowing another payment |
| Return/cancel | Draft and context retained where storage is available; no claim that the URL proves no charge or cancels a subscription |
| Email and billing | Both authorized inboxes tested independently; provider acceptance distinguished from receipt; invoices, payment-method update and cancellation tested on the same test subscription |
| Recovery | Signed duplicate-event idempotency, genuine fulfillment failure/retry, and staging rollback/reapply evidence; refund and subscription cancellation recorded separately |

Use Stripe's current testing instructions for test numbers. Some Stripe-generated test receipts require manual sending from its Dashboard; automatic test receipt delivery must not be assumed. Never use live sham purchases to manufacture history.

## Trust and discovery

Google Business Profile requires actual in-person customer contact. An online-only platform is ineligible; service-area settings and a virtual mailing address do not change that. If the business genuinely meets customers in person, assess that real operation under Google's rules.

Real traffic, useful product pages, genuine customer reviews, consistent operator details and reliable support can help customers assess the business. They are not documented mechanisms for suppressing Safe Browsing, TLS warnings, issuer verification or Link sign-in. Sandbox payments do not reach payment networks and cannot build issuer transaction history. Identify the exact warning and system before attempting a remedy.

Sources: [Stripe 3DS](https://docs.stripe.com/payments/3d-secure), [ambiguous errors](https://docs.stripe.com/error-low-level), [idempotency](https://docs.stripe.com/api/idempotent_requests), [receipts](https://docs.stripe.com/receipts), [sandboxes](https://docs.stripe.com/sandboxes), [business checklist](https://docs.stripe.com/get-started/account/checklist), [Google Business Profile eligibility](https://support.google.com/business/answer/13763036?hl=en), [Google representation rules](https://support.google.com/business/answer/3038177?hl=en), [Chrome warnings](https://support.google.com/chrome/answer/99020?hl=en).
