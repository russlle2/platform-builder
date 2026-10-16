# Controlled staging fulfillment recovery rehearsal

Prepared source only. No provider operation, checkout, payment, refund, mail, DNS change or database mutation was executed while implementing this control. The source is not itself connected-staging evidence. Use it only after the new exact final main SHA has passed push CI and has been staged with its matching full catalogue, certification and staging journal. Earlier release identities are historical.

The protected workflow is `staging-recovery-proof.yml`. It shares the staging transition concurrency lock, requires the staging environment, exact current main and workflow SHA, matching deployed application/catalogue/schema, public `trialDays: 0`, the fixed Netlify account and staging project, and existing runner-held secrets. Credentials are never exported. Supabase requests are fixed read-only REST projections. Netlify changes are limited to creating one new empty task-owned site with its fault alias, then removing only that recorded singleton alias. Optional retry uses the existing protected application endpoint for the exact recorded event; the helper never writes queue/database rows directly.

## Prepare before card entry

1. Generate a unique 24-character lowercase hexadecimal nonce. Use the normal public wizard with actual task-owned account details, a synthetic public business, Basic plan and site address `dc-r-<nonce>` (29 characters). Do not use the anonymous sample or intercepted-checkout harness as payment evidence. Save the real preview edits to be verified on the delivered site.
2. Open the real Stripe TEST checkout through that normal browser flow, then stop before entering/submitting card details. Resolve only this exact staging checkout intent and session SHA-256 through the supported Supabase read-only connector. The workflow must receive an intent UUID and session commitment, never a raw `cs_test_*` value, checkout URL, email, token or payload. The reservation must still be `checkout_pending`, owned by the intent, with at least 10 minutes remaining; intent age must be at most 30 minutes.
3. Prepare a local dispatch JSON file with exactly these input names; `binding_json` is a serialized JSON string whose exact fields are `releaseSha`, `certificationHash`, `stagingJournalHash`, `catalogHash`, `manifestHash`, `nonce`, `intentId`, `sessionHash`. All hashes come from independently reviewed source/candidate records, not a value inferred from the endpoint being checked. `releaseSha` must be the newly selected final main SHA. The nonce/UUID/session hash must belong to the checkout just opened.

```json
{
  "operation": "prepare",
  "binding_json": "{\"releaseSha\":\"NEW_FINAL_MAIN_SHA\",\"certificationHash\":\"NEW_CERTIFICATION_HASH\",\"stagingJournalHash\":\"NEW_STAGING_JOURNAL_HASH\",\"catalogHash\":\"NEW_CATALOG_HASH\",\"manifestHash\":\"NEW_MANIFEST_HASH\",\"nonce\":\"UNIQUE_24_LOWERCASE_HEX\",\"intentId\":\"EXACT_TASK_CHECKOUT_INTENT_UUID\",\"sessionHash\":\"SHA256_OF_EXACT_TEST_SESSION\"}",
  "confirm": "PREPARE OWNED RECOVERY FAULT"
}
```

The placeholders are intentionally invalid. After replacing them from the real reviewed records:

```sh
gh workflow run staging-recovery-proof.yml --repo russlle2/platform-builder --ref main --json < reviewed-recovery-dispatch.json
```

Preparation first proves the deterministic site is absent (404), then submits the exact name `platform-dc-r-<nonce>` and alias `recovery-fault-<nonce>.dailyclarity.org` in one Netlify create request. It does not change DNS, request SSL, deploy content, rename a site or mutate any existing site. It independently reads back the site/account/name/default URL identity and unchanged singleton alias before saving `recovery-journal.json` with its canonical hash.

**Do not pay until the prepare run has succeeded and the independent alias readback is retained.** Provider acceptance is a fact to observe; the official schema supporting `domain_aliases` is not proof that a particular create request succeeded. Signed payment event time must be after the recorded `preparedAt`; wait until the following second before submitting payment. The actual browser/card flow remains manual or separately authorized through its intended interface.

## Capture the genuine failure, clear the fixture, and inspect recovery

After the actual paid nonzero TEST checkout, independently read the exact provider event/session/subscription/charge. The workflow accepts `checkout.session.completed` for this card-based rehearsal; it does not synthesize an event. Signed event time, test mode, paid amount, intent/session/slug metadata and subscription must match the retained local event and order. Intent/portal must record the exact alias failure, and the event must be failed or dead-letter. Billing events may legitimately change the order's status; local first-payment amount/time and exact financial identity are checked separately.

Use the same `binding_json`, `operation: clear`, exact `event_id`, and:

- `source_run_id`: the exact completed prepare run ID.
- `source_artifact_id`: its unexpired `staging-recovery-journal-<run>-<attempt>` artifact ID.
- `source_journal_hash`: the reviewed canonical hash of that run's `recovery-journal.json`.
- `confirm`: `CLEAR OWNED RECOVERY FAULT`.

The helper verifies the repository/main/manual workflow/commit/attempt and artifact relationship before download and verifies journal bytes after download. It refuses a different site, alias set, custom domain, deployed fixture, intent, session, event or order. It saves a `clear_requested` recovery journal with sanitized failure commitments **before** its single alias-only PATCH. After a second provider readback proves the alias set empty, it saves `cleared-journal.json` and emits its hash. Both files are retained; use the **cleared** journal hash and clear-run artifact as the next source.

Allow the normal five-minute sweeper and configured backoff to run. Use `operation: inspect`, the same binding/event, and the exact clear-run artifact and cleared-journal hash. No confirmation phrase is needed for inspect. Successful queue processing erases event payload/error; inspection therefore checks retained event ID/type/livemode/business key/time, the captured order ID commitment, exact fixture site ID, active portal, completed intent, first payment evidence, and the provider's ready deployment. It does not require scrubbed metadata to remain. `recoveryObserved` requires all those observations and an independently cleared alias.

The queue has eight attempts and eventually reaches `dead_letter`. If the exact event is still failed/dead-letter after the fault is cleared, use `operation: retry`, the exact clear-source artifact/journal/event, and `confirm: RETRY OWNED RECOVERY EVENT`. This invokes only the existing protected application retry endpoint for that bound event. A 202 means dispatched, not fulfilled; inspect again using the original clear-source artifact after normal processing. An unsuccessful retry HTTP response is unconfirmed and must be inspected before another retry.

## Uncertain responses and evidence scope

A create timeout retains `creation-requested.json` but cannot prove site ownership or preparation. An ignored alias or failed readback may also retain `fixture-created.json`. These checkpoints never authorize payment or later alias changes; preserve them and stop for bounded reconciliation. A prepare rerun will refuse an already-existing deterministic site. No delete/recreate or adoption fallback is provided.

A clear timeout retains a source-bound `clear_requested` journal. Inspect that exact artifact and hash. A subsequent clear can confirm already-empty aliases without another write, or remove the still-unchanged owned singleton alias only while exact failure evidence remains. The helper never treats a timeout as proof that the provider did nothing.

Control artifacts contain task-owned public site identity/nonce/UUID and hashed session/event/order/business-key commitments, timestamps, counts and fixed states. They contain no email, session URL, raw session ID, event payload, customer data, auth/portal/lease token or full provider error. Artifacts are retained 30 days; copy the reviewed sanitized facts into final underlying evidence before expiration. The helper never attests a complete connected gate. Actual Stripe charge and refund, cancellation/billing convergence, real delivered HTML/edits, both inbox receipts and normal same-browser sign-in remain separate observations.
