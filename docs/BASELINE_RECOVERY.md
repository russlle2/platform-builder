# Recover the reviewed launch baseline

This is a narrow repair for the observed production state: the legacy manifest contains 5,485 entries, while the current launch application serves zero accepted templates. It can restore the approved curated 60-template baseline with new paid sales paused. It does **not** certify, replace, delete, or promote the original 5,486-template library. The full certification and connected-staging gates remain unchanged.

The protected `recover-baseline.yml` workflow targets only `dailyclarity.org`, the pinned production Netlify site, its reviewed account, and Supabase project `psxmvaushwsboogfnyqi`. It shares the `dailyclarity-production` concurrency group with certified promotion/rollback. No provider recovery has been performed merely by adding this tooling.

## Prepare and verify

1. Merge the reviewed recovery code and obtain successful push CI on the exact main SHA. The runner requires a clean checkout of that SHA, the production schema gate, and matching provider identity.
2. Configure the intended new Netlify deployment with `DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE=launch`, `DAILYCLARITY_SALES_PAUSED=true`, and `BOOKING_KIT_ENABLED=false`, each readable in both builds and functions. Keep service credentials secret. The pause blocks new paid sales while existing webhook/fulfillment processing remains available.
3. Stop competing Git/admin publishers for the bounded operation. Automatic production builds were stopped during the provider repair; confirm that operational state is still in effect. GitHub concurrency only serializes workflows using its group. Blob reads/writes are not a cross-provider atomic transaction, and Netlify settings must not be represented as such a lock.
4. Dispatch **verify** on main. With both artifact inputs empty, it exports the exact approved curated material under `library/`. Alternatively provide an exact run/artifact ID containing that directory. Verification validates all export bytes and records the canonical recovery receipt hash, current production deployment ID/SHA, exact raw legacy-manifest hash, and an allowlisted `previousRuntime` snapshot. The snapshot includes schema readiness/versions and the fixed diagnostic `schemaProbeFailure`, without raw provider details or missing-requirement contents. It performs no provider writes.
5. Retain the `baseline-recovery-library-<run>` artifact and separate receipt artifact. Review the actual hashes and original deployment identity from this run. The required source must still be the observed broken state; a healthy or unexpected catalogue is refused.

## Recover

Dispatch **recover** on the same main SHA using the retained library artifact IDs, reviewed `receipt_hash`, `legacy_manifest_hash`, `previous_deployment_id`, `previous_release_sha`, and confirmation **RECOVER BASELINE**. A changed export, deployment, database, account, or raw manifest stops the operation.

The old application may lack `DAILYCLARITY_SUPABASE_PROJECT_REF` in its deployed environment even after the database and future deployment settings have been repaired. Its schema probe then returns `false` with both versions `null` without contacting the database. Recovery permits precisely that reported missing-ref state for the captured old deployment, provided its URL-derived database identity still matches. Missing URL/service credentials, a project mismatch, unexplained unready status, or other schema versions remain rejected. The separate live database and future-environment gates still run before recovery; the new application's activation must prove both current schema versions and readiness. Staging and rollback must reproduce the old schema state exactly as captured, rather than relabeling it healthy.

The ordered operation is:

1. Back up the **exact raw legacy manifest bytes and metadata**, capture an allowlisted runtime snapshot and original deployment identity, and read back a durable journal in the separate `dailyclarity-baseline-recovery` Blob store. Preserve that journal locally as `recovery-journal.json` before publication.
2. Stage all reviewed files under the immutable `_releases/<curated identity>/` prefix and verify actual readback bytes. Leave the active manifest unchanged.
3. Write an immutable deployment proof, then publish the matching launch application with new paid sales paused. Recheck the reviewed original deployment immediately before publication.
4. Bind the current published deployment to the journal through Netlify's immutable file/API evidence. This runs even if the deployment CLI reports failure after publication, and does not require healthy application routes.
5. Activate the reviewed manifest last, after proving the new application identity, schema, and sales pause. Read back the manifest and require 60 serving templates, paused checkout/custom-build sales, and disabled Booking Kit sales.

The workflow retains the local journal artifact on failure as well as success. The durable remote journal/backup exists before staging and deployment. No legacy objects are removed. Keep all backup objects, historical deployment files, and the final artifact IDs.

## Resume or roll back

Do not blindly rerun **recover** after a deployment has changed. Its required original deployment ID/SHA prevents the new application from being recaptured as the old baseline.

For a completed deployment whose final activation failed, dispatch **activate** with the saved journal artifact IDs, its canonical `journal_hash`, and **ACTIVATE BASELINE**. Use the exact journal release SHA on main; CI/schema/future-configuration checks still apply. It validates/binds the existing deployment and retries activation without exporting, recapturing, or deploying another application. An empty catalogue can be cached for five seconds; the runner retries only the exact final count/readiness attestation failure, up to six attempts separated by two seconds. Every attempt reruns the core checks. Any other error stops immediately; exhausted attempts retain the journal for an explicit retry or rollback.

For restoration, dispatch **rollback** with the saved journal artifact IDs, its canonical `journal_hash`, and **ROLLBACK BASELINE**. It does not require current CI, future deployment configuration, or healthy application routes before restoration. If needed, it first binds an unrecorded deployment using its immutable recovery proof; foreign deployments are refused. It restores the original manifest **bytes and metadata**, restores the original Netlify deployment, and verifies the recorded old runtime identity. This truthfully restores the original **broken zero-serving state**, not a certified or healthy catalogue.

Rollback does not silently restore provider environment settings changed before recovery. Those settings are recorded separately in the provider configuration audit. The restored old application may not honor the new sales-pause flag and may restore its previously enabled custom-build checkout capability, even while serving zero accepted templates. Do not describe rollback as guaranteeing a global sales pause; inspect the recorded old capabilities and verify the restored runtime. Any further provider settings change requires its own reviewed operation. A failure between manifest restoration and deployment restoration retains the journal for an explicit retry. No blind automatic rollback or deletion occurs.

## Evidence and limits

The local core rehearsal exercises the actual approved export with an in-memory Blob adapter; runner tests cover mode/target gates, digest mismatch, stage/CLI/binding failures, activation resume, and rollback without current CI. They are not evidence of a connected deployment or purchase.

After successful recovery, retain the provider journal, proof, final deployment ID, runtime response, and a live preview/editor check. Paid sales remain paused until actual connected checkout/webhook, provisioning, email, refund/recovery, and rollback evidence passes. Continue full original-catalogue processing separately using [CERTIFIED_CATALOGUE_RELEASE.md](CERTIFIED_CATALOGUE_RELEASE.md); this recovery is never supplied as a 5,486-template certification receipt.
