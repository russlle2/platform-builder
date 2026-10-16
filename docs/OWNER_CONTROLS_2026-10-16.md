# Customer control and launch guidance follow-up

This follows the first experience audit and PR #40. It addresses practical customer questions that remain after a visitor chooses a design. These changes have not been measured for conversion lift.

## Account and public contact email

The personalized preview now asks separately for an account email and a public website contact email. An explicit “Use account email” action lets someone choose the same address. New account addresses are not silently copied into public website fields.

The private address is used for draft follow-up, Stripe checkout, ownership, receipts, welcome messages, and enquiry notifications. It is sent to checkout as a separate `accountEmail` field. Public `EMAIL` values remain the website’s contact information. Reserved account-email fields are stripped from incoming public template values. Fulfillment uses the saved checkout intent’s private address rather than allowing public content or a changed Stripe address to replace the account recipient.

Older drafts and checkout requests with no account-email field keep their original shared-address behavior. An explicitly empty or invalid new field fails validation rather than falling back. Sample browsing remains separate from the visitor’s real draft. Public contact edits in the authenticated customer portal do not transfer ownership or change notification delivery.

Visitor confirmation emails now use the public website email for Reply-To. The private account/notification address must not leak through that header. Platform contact requests keep their existing configured recipient behavior.

This is a separation of delivery purposes, not email-address verification. The normal verified sign-in and ownership controls remain required.

## Scope review before a custom-build payment

The default custom-build action saves a detailed request in the existing DailyClarity contact inbox, without opening Stripe or authorizing payment. The complete brief is submitted in the request body. If its combined size exceeds the existing inbox limit, the form asks the visitor to shorten it rather than truncating requirements.

The success message distinguishes a saved brief from confirmed notification delivery. Saving a brief does not promise an accepted scope or start date. Visitors can separately choose the existing $500 checkout after discussing scope. Payment consent is never restored from a saved draft and resets when the brief changes. The server still requires explicit checkout consent; no operator approval record is invented.

Pricing, search metadata, checkout text, and the product assistant now describe the same sequence. Project-specific hosting, revisions, inclusions, and timing must still be agreed by DailyClarity. No new price, revision allowance, delivery deadline, or managed-service cadence is promised.

## Practice-specific manual review

Five practice types receive useful visitor questions before publishing: therapy fees/insurance/online visits; sound-bath preparation/accessibility; coaching format/commitment; holistic methods/qualifications; and aromatherapy ingredients/session inclusions.

These are manual checks, separate from the supplied-detail completeness score. Declared template pages provide preview shortcuts only. They do not establish working booking, payment, form delivery, or clinical credentials. No completion state is stored or carried between businesses. The public checklist uses the same criteria and no longer requires arbitrary service or testimonial counts.

## Customer help

`/help` explains the existing account, publishing, enquiry, billing, domain, and content-access paths. It links to the actual controls and policies, including support where a self-service export or account-address change does not exist. It does not promise an export format, migration availability, support deadline, or undocumented hosting cutoff. The shared footer links to it, and the timed lead popup is suppressed while customers read it.

## Verification and publication

Unit and browser coverage exercises distinct private/public addresses, legacy drafts, malformed identity, fulfillment retries, visitor Reply-To, public contact edits, unpaid review persistence/failure/size limits, payment consent, and practice-review navigation. The new review browser suites are included in CI. Mocked/local tests do not prove provider delivery, received email, a real Stripe checkout, or production publication.

At implementation time, the normal GitHub release-asset upload still returns HTTP 401, including a fresh 40-byte canary attempt with the current official client. The prior PR #40 bundle is tied to its own commit and must not be presented as this follow-up’s release. Publish through the existing exact-commit certification, staging, connected-evidence, and promotion workflow once normal upload access works. Do not weaken those gates or reuse unrelated provider-test results.
