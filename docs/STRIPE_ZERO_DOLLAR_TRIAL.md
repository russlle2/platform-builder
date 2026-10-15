# Stripe website purchase: $0 real cost

This procedure uses DailyClarity's **staging website and existing Stripe test account** to exercise the actual hosted checkout, webhook, website delivery, and customer editing flow. The Basic plan charges **$20 in fictional test funds; $0 real money moves**. This document is a procedure, not evidence that a connected purchase has already passed.

For the separate PayPal Sandbox diagnostic, use [PayPal trial](PAYPAL_ZERO_DOLLAR_TRIAL.md). PayPal's diagnostic does not create a hosted website.

## Before starting

The operator must deploy and verify the current staging release at **https://dailyclarity-staging.netlify.app** with:

- `DAILYCLARITY_ENVIRONMENT=staging`, the staging Supabase project, and the existing Stripe **test** keys, prices, webhook, and billing portal.
- `STRIPE_TRIAL_DAYS=0` in the staging build and functions environment, followed by a redeploy. A seven-day free trial does not exercise the immediate paid fulfillment path described here.
- A usable template catalogue, checkout enabled, working fulfillment background/scheduled functions, and configured Postmark sender and customer login. Verify the deployed runtime and schema using the [fulfillment runbook](STRIPE_FULFILLMENT_RUNBOOK.md).

Keep production's sales pause and live configuration separate. Do not paste API keys into a website form or chat. If staging is unavailable or checkout reports that setup is incomplete, stop and fix the named configuration before purchasing.

## Run the test

1. Open **https://dailyclarity-staging.netlify.app**. Choose an available template and the **Basic $20/month** plan. Use a distinct business name, an unused website slug, and an email inbox you control. Customize a visible heading so you can recognize the delivered website.
2. Continue to Stripe's hosted checkout. Confirm it visibly identifies **test mode** and shows **$20 due now**, not a free trial. The operator should confirm that the Checkout Session has `livemode=false` in the expected test account. If test mode is unclear, stop; never enter a real card for this run.
3. Enter Stripe's test card **4242 4242 4242 4242**, expiry **12/34**, CVC **123**, and valid requested billing details. Finish checkout using the normal controls. If Stripe requests an additional verification step, complete its test flow.
4. On returning to DailyClarity, keep the result page open. A checkout success screen alone does not prove website delivery. Wait for the application's **order-confirmation** and **website-live** emails in your actual inbox; check spam as well. Stripe does not automatically email its own test payment receipts.
5. Open the customer website URL from the delivery email or the verified site link. In staging it should be the provisioned site's **`netlify.app` HTTPS URL**, with indexing disabled. Confirm your business name and customization appear. The operator must compare this exact URL with the saved site and fulfillment records.
6. Sign in to the staging dashboard with the **same email used at checkout**. Open the login email in the browser where you requested it. Confirm your website appears under your account. Open its visual editor or business-details editor, change a visible heading, then save and publish. Reload the delivered customer website and confirm the change is live.
7. Send a clearly labelled test enquiry through that customer website. In your dashboard/portal, open **Website enquiries** and confirm it was saved. Check the notification result and the actual recipient inbox. **“Email accepted by provider” does not prove inbox delivery.** The Website services panel shows the saved notification address; changing the public website email does not replace a separately saved notification address.
8. Open **Manage billing** from the staging dashboard and confirm it opens the Stripe **test** customer portal for this subscription. Cancel the test subscription when finished so later test renewals do not add noise. Keep any test workspace needed for debugging until its results are recorded.

No separate Supabase, Postmark, or Stripe account is needed for this customer flow. DailyClarity manages the website records and notification service. Stripe here bills the customer's DailyClarity subscription; it does **not** configure the customer's business to accept payments from its own customers.

## Record the outcome

A successful connected run needs all of these observations:

- The expected Stripe test Checkout Session completed with payment recorded; the matching signed webhook and fulfillment job succeeded.
- The staging order and site belong to the checkout customer, the delivered HTTPS URL matches stored records, and both application emails arrived.
- Normal customer sign-in shows that customer's website; an authenticated edit was published and appeared at the delivered URL.
- A real test enquiry was saved, its notification result was recorded, and its email arrived at the saved recipient address.

Record the staging deployment SHA, test Session ID, and pass/fail results privately with the operator. Do not share magic links, portal tokens, customer information, or secret keys. Automated fixtures, a manually inserted order, or `/api/test-purchase` do not replace this connected test.

If delivery stalls, do not repeatedly buy the same site. Keep the original test Session ID and have the operator inspect the [fulfillment queue and retry controls](STRIPE_FULFILLMENT_RUNBOOK.md). Fix the failed step, then retry that work. If a sign-in or delivery email never arrives, report that step as failed rather than inferring success from a saved database row.

This run does not establish live billing readiness, production branded-domain readiness, a PayPal capture, or certification of the full template catalogue.

Official references: [Stripe test cards and no-real-money testing](https://docs.stripe.com/testing), [subscription testing](https://docs.stripe.com/billing/testing), and [webhook verification](https://docs.stripe.com/webhooks).
