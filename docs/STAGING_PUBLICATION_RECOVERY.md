# Owned publication recovery rehearsal

This V2 control prepares a real publication failure on one new staging fixture. It does not change application fulfillment behavior or manufacture an event. Source and mocked-provider tests do not prove connected recovery. Use the control only after the exact new main commit has successful push CI and its matching full catalogue, certificate and staging journal are actually deployed.

The older [alias rehearsal](STAGING_RECOVERY_REHEARSAL.md), workflow and journals remain unchanged. This separate workflow accepts only V2 publication journals. Earlier alias-preparation HTTP 422 failures remain failures; they cannot be relabeled or reused. Use a fresh nonce and normal checkout journey.

## Scope and mechanism

`staging-publication-recovery.yml` retains the protected `staging` environment, the shared `dailyclarity-staging` concurrency group, exact current main/workflow checks, successful release CI, fixed Netlify account/site/project boundaries, staged release marker and full catalogue/schema readiness. Public staging configuration must show a zero-day trial. Credentials remain in the runner.

The workflow creates only `platform-dc-r-<24-lowercase-hex-nonce>` after proving its deterministic hostname absent and its task-owned TEST checkout still unpaid and reserved. It never adopts an existing site. Production and application-staging site IDs are explicitly forbidden fixture targets. Every fixture observation requires its original account, name, default hostname, no custom domain, no aliases and no connected repository.

The fixture receives exactly three source-controlled files: `404.html`, `_headers` and `robots.txt`. There is no index page, rewrite, script, function or external asset. The files prohibit indexing; the root must independently return HTTP 404, the exact fixed body digest and a `noindex` response header. Requested upload digests must belong to this fixed manifest. No workflow input supplies content, filename, upload URL or deployment ID.

After that baseline is ready and actually published, the control locks that exact deployment and polls its provider state. It re-reads the published site, verifies the lock and checks the root 404 again before emitting a prepared journal. Netlify documents that a [locked deployment](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#locked-deploys) keeps subsequent deploys from publishing. Its [lock API](https://open-api.netlify.com/#tag/deploy/operation/lockDeploy) can publish a noncurrent deployment when locking it, so proving the baseline is already current before the request is mandatory. A 200 or 202 response is only request acceptance; independent GET observations are required. The deploy title uses the documented `createSiteDeploy` query parameter.

Normal fulfillment then finds and reuses this task-owned default-domain site, persists its ID, uploads the actual purchased template and verifies the customer-facing hostname. A locked 404 fails the existing verification after 18 attempts. This is the normal publication failure path, with no runtime fault injection. The helper requires the exact resulting error, a genuine paid nonzero signed TEST checkout event, one bound order, a failed portal containing the fixture ID, and an unprovisioned reservation before it may unlock the baseline.

## Prepare and run

1. Generate a fresh 24-character lowercase hexadecimal nonce. Use the ordinary staged wizard, an authorized inbox, synthetic public business details, Basic plan and site slug `dc-r-<nonce>`. Save the real preview edits that will later be checked on the delivered site.
2. Open the normal Stripe TEST checkout and stop before submitting its test card. Resolve only this task's checkout-intent UUID and SHA-256 of the actual `cs_test_` session through supported read-only access. Do not put an email, raw session ID, checkout URL or token in workflow input. The pending reservation must have more than ten minutes left, and the intent must be less than thirty minutes old.
3. Create a reviewed dispatch JSON file with these workflow inputs:

```json
{
  "operation": "prepare",
  "binding_json": "{\"releaseSha\":\"EXACT_STAGED_MAIN_SHA\",\"certificationHash\":\"REVIEWED_CERTIFICATE_HASH\",\"stagingJournalHash\":\"REVIEWED_STAGING_JOURNAL_HASH\",\"catalogHash\":\"REVIEWED_CATALOG_HASH\",\"manifestHash\":\"REVIEWED_MANIFEST_HASH\",\"nonce\":\"FRESH_24_LOWERCASE_HEX\",\"intentId\":\"EXACT_TASK_INTENT_UUID\",\"sessionHash\":\"SHA256_OF_EXACT_TEST_SESSION\"}",
  "confirm": "PREPARE OWNED PUBLICATION FAULT"
}
```

All placeholders are intentionally invalid. Resolve release hashes from independently reviewed candidate records. Then dispatch the protected workflow on main:

```sh
gh workflow run staging-publication-recovery.yml --repo russlle2/platform-builder --ref main --json < reviewed-publication-recovery-dispatch.json
```

Do not submit the test payment until preparation succeeded and its immutable `recovery-journal.json` proves the actual locked 404 observations. Submit after the next whole second so the signed event timestamp is after `preparedAt`.

## Capture failure and restore ordinary processing

Independently observe the exact TEST Stripe session, event, subscription, charge and nonzero paid amount. This helper accepts only the normal `checkout.session.completed` event for the card-based rehearsal. It does not synthesize or directly insert queue/database rows. The signed envelope, metadata, intent, session commitment, subscription, first-payment evidence, order and fixed HTTP-404 failure must agree.

Dispatch `operation: clear` with the same binding and:

- `source_run_id`: the exact completed prepare run, including its real artifact attempt.
- `source_artifact_id`: its unexpired `staging-publication-journal-<run>-<attempt>` artifact ID.
- `source_journal_hash`: the independently reviewed canonical SHA-256 of `recovery-journal.json`.
- `event_id`: the exact independently observed TEST event.
- `confirm`: `CLEAR OWNED PUBLICATION FAULT`.

The clear operation rechecks the failure, original fixture, still-published baseline and root 404. It writes a source-bound `clear_requested` journal with failure commitments before one unlock request. It polls the exact baseline lock and independently observes an unlocked published deployment before writing `cleared-journal.json`. It does not assume that unlocking instantly publishes any earlier candidate. A successful clear is not successful fulfillment.

Allow the normal sweeper/backoff to recover. Use `operation: inspect` with the exact clear-run artifact and **cleared** journal hash. No confirmation phrase is needed for inspection. Recovery is observed only when the original event and order remain bound, the queue succeeds, the portal is active, the intent completes, the same fixture ID is recorded in both portal and provisioned reservation, and the provider publishes a ready unlocked deployment different from the 404 baseline. Successful processing intentionally scrubs event payload/error, so inspection uses the captured failure commitments and retained event identity.

If the exact event is still failed or dead-letter after clearing, `operation: retry` and `confirm: RETRY OWNED RECOVERY EVENT` invoke only the existing protected application retry endpoint. A 202 means dispatched. Reinspect using the same clear-source artifact; do not treat dispatch as fulfillment.

## Uncertain operations and retained evidence

Every create/deploy/upload/lock/unlock request has an immutable checkpoint before the write. The fixed upload checkpoint commits to all three permitted files; a partial upload cannot broaden that set. Syntactically valid returned fixture/deployment IDs are retained before full metadata validation, explicitly marked unprepared. These records permit bounded read-only investigation, not adoption, payment or additional mutation. Unknown upload digests and foreign provider identities stop immediately.

Preparation never automatically retries a mutation or adopts a partially prepared site. An interrupted or rejected prepare may leave its own static fixture published or locked. Preserve the actual artifact, inspect only its recorded identity and use a fresh task journey after resolving the failure. No automatic delete, restore, DNS edit or lock removal is provided. A missing prepared journal never authorizes payment.

An uncertain unlock retains `clear_requested` with the exact captured failure. A later clear can confirm the exact original baseline already unlocked, preserve the same event/order commitments and emit a cleared journal without another provider write. If it remains locked, another unlock is permitted only after all original failure/publication checks pass. Concurrent ordinary retry completion does not erase the captured evidence. Changed fixture domains, repository, account, deployment or payment identity stop the control.

Provider calls have 25-second request timeouts. Ready/lock polling also has a 90-second elapsed-time budget and thirty-poll ceiling. The ten-minute protected job retains sanitized control artifacts with `always()` even after ordinary failures. Logs omit response bodies, credentials, private inbox data and payment payloads. Public fixture identity, fixed content hashes, hashed financial identifiers, timestamps and fixed states are retained for thirty days.

These observations do not attest the entire connected gate. Actual receipt/inbox delivery, sign-in, preview-to-delivered content and edits, customer ownership isolation, HTTPS/noindex, refund, subscription cancellation, billing convergence, and staged rollback/reapply require their own real observations under the same release binding. The rehearsal neither performs nor claims those checks.
