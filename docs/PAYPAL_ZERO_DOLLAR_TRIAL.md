# PayPal trial: $0 real cost

The `/paypal-test` page creates a **$1.00 USD Sandbox order** and sends you through PayPal's actual Sandbox approval and capture flow. Sandbox balances are fictional; no real money moves. PayPal does not accept a zero-total order. This is a one-time payment diagnostic, not a subscription or a purchase of a hosted website.

## Run it locally

You need Node 22 or 24, pnpm, and a free PayPal Developer account.

The implementation is on `main` (originally introduced in [release PR #19](https://github.com/russlle2/platform-builder/pull/19)). To get a separate checkout without changing an existing project:

```sh
git clone --depth 1 --branch main https://github.com/russlle2/platform-builder.git dailyclarity-paypal-trial
cd dailyclarity-paypal-trial
```

1. Open [PayPal Developer → Sandbox apps](https://developer.paypal.com/dashboard/applications/sandbox). Select or create an app attached to your Sandbox **Business** account. Keep the Sandbox client ID and secret ready. Do not use Live credentials.
2. Open [Sandbox accounts](https://developer.paypal.com/dashboard/accounts). Select or create a separate **Personal** account, view its test login/password, and ensure it has a test balance. These are the buyer credentials you use inside PayPal; your real PayPal login is only for the Developer Dashboard.
3. From this repository's updated checkout, run:

   ```sh
   pnpm install --frozen-lockfile
   pnpm paypal:trial
   ```

4. Paste the Sandbox app client ID and secret into the terminal's hidden prompts. The launcher holds them in memory, generates a session-signing secret, and starts the local server. It does not write credentials or change your `.env` files.
5. Open **http://localhost:3001/paypal-test**. Click **Continue to PayPal Sandbox**. Check that the PayPal address is `sandbox.paypal.com` or `www.sandbox.paypal.com`, log in with the **Personal Sandbox buyer**, and approve the $1.00 test purchase.
6. On return, wait for the verified receipt. Download it. It must show `COMPLETED`, `sandbox`, `1.00 USD`, and distinct order/capture IDs. The Sandbox Business account's activity should contain the same capture.

Press Ctrl+C in the terminal when finished. The local server binds only to this computer. If port 3001 is occupied, set `PAYPAL_TRIAL_PORT` to another port and use the URL printed by the launcher.

## What a successful run proves

It proves this Sandbox app can create an order, redirect a buyer to PayPal, capture the approved payment on the server, and return a verified receipt to the initiating browser. The server validates the order, session, amount, currency, and completed capture. Reloading the result does not create another payment; request IDs make retries idempotent.

It does **not** purchase or provision a website, send a delivery email, certify the template catalogue, or test live billing. Stripe's existing subscription/website fulfillment flow is separate. The receipt is retained in a signed browser session for 30 minutes; download it for your records. Resetting the test or restarting the launcher clears access to that local receipt, not PayPal's activity record.

## Quick checks

- **Cancel:** start a test and cancel inside PayPal. Expect a cancellation message and no completed receipt. Start over using the reset control.
- **Refresh:** after success, refresh the page. Expect the same order/capture, not a second purchase.
- **Retry:** if capture times out, use the retry control. Keep the same browser and order; do not start a fresh order to resolve an uncertain result. Check Sandbox Business activity if needed.
- **Expired session:** after 30 minutes or a server restart, check PayPal's activity for the earlier order before starting another test.
- **Setup unavailable:** the app is disabled or missing Sandbox configuration. The local launcher supplies the enable flag and signing secret automatically.
- **PayPal authentication error:** check that both app values are copied from the Sandbox tab of the same app. Never paste secrets into the browser page, GitHub, or chat.

## Enable the same page on an existing deployment

Set the following server/function environment variables on the intended Netlify site and redeploy:

```dotenv
PAYPAL_SANDBOX_ENABLED=true
PAYPAL_SANDBOX_CLIENT_ID=<sandbox app client ID>
PAYPAL_SANDBOX_CLIENT_SECRET=<sandbox app secret>
PAYPAL_SANDBOX_SESSION_SECRET=<at least 32 random characters>
PAYPAL_SANDBOX_SITE_URL=https://<exact deployed hostname>
```

Generate the signing value with `openssl rand -hex 32`. Use the exact preview hostname for a preview; the return URL and same-origin checks must match. The route is noindex, uncached, and excludes page analytics. It never calls PayPal's live API, even when enabled on a production hostname. No new database, paid hosting, or email provider is needed for this diagnostic.

The repository includes automated provider-response and browser fixtures. Those fixtures do not prove an actual PayPal transaction. A connected purchase is only verified after you obtain the matching receipt and Sandbox activity record.

Official references: [Sandbox overview](https://developer.paypal.com/sandbox-testing/overview), [accounts](https://developer.paypal.com/sandbox-testing/accounts), [Orders create](https://developer.paypal.com/api/orders/v2/orders-create), [Orders capture](https://developer.paypal.com/api/orders/v2/orders-capture), [idempotency](https://developer.paypal.com/api/rest/reference/idempotency/).
