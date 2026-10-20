# Reviewed demo maintenance release

This release publishes six Liam-narrated videos, their captions, transcripts and
posters, the shared player, demo pages and homepage player. It preserves the
currently published application's backend source, dependency lockfile, deployment
configuration and certified catalogue. It does not replace the planned full
platform upgrade, which remains on `main` and still needs its normal release.

## Fixed source and separate identities

`apps/generator-app/scripts/demo-maintenance-release.json` seals one source commit
whose only parent is the deployed production source. The guard reconstructs the
original PR #50 binary patch in a temporary Git index and requires the resulting
entire tree, exact thirty changed paths, modes, blobs and local bytes to agree.
There is no arbitrary source SHA input. Never merge this maintenance source branch
into `main`: it deliberately omits pending platform changes from this deployment.

The maintenance controller is reviewed and merged into `main`, with successful CI
for that exact main SHA. It builds the fixed source in a separate, credential-free
checkout. A full Netlify Next.js adapter build includes static assets, functions,
edge functions and routing configuration. Backend source is unchanged; rebuilt
backend binaries are not claimed to be byte-identical.

The new application SHA is distinct from the unchanged catalogue SHA. The public
marker records both. The existing catalogue certificate is neither rewritten nor
claimed to certify new application code. Runtime checks require the new app SHA,
original certificate/catalogue hashes, exact production site/project identity,
all readiness flags and 5,486 templates. Existing full-release gates are unchanged.

## Protected sequence

All operations use `demo-maintenance.yml` on current `main`, its existing protected
production environment and the shared `dailyclarity-production` concurrency group.
Keep another production publisher idle during the sequence. Reconcile any existing
run before dispatch; never duplicate an active or successful operation.

1. **prepare** (`PREPARE DEMO DRAFT`): run source scope checks, frozen installation,
   lint, typecheck, unit tests, local public-route tests and the production adapter
   build. Capture the actual healthy production deployment and marker, unchanged
   catalogue pointer/certificate, hashed provider configuration/environment and
   read-only Auth readiness. Require stopped Git builds. Create a production-context
   draft without publishing it; verify provider identity, marker, runtime and all
   24 media bytes. The record artifact is a result only after the run succeeds.
2. **verify-draft** (`VERIFY DEMO DRAFT`): supply the actual prepared record's
   `runId`, `runAttempt`, `artifactId`, `artifactDigest` and canonical `recordHash`
   in `record_source`. Verify live successful producer metadata and archive digest.
   Exercise all eight public routes at desktop/mobile widths and all six videos'
   play, seek, caption cues and transcript links. Fetch all 24 files and compare
   exact hashes, sizes and content types. Save the actual QA artifact.
3. **promote** (`PROMOTE DEMO DRAFT`): supply the same record and actual QA producer,
   artifact digest and canonical `qaHash` in `qa_source`. QA must be from a successful
   protected run, refer to the exact record/deployment and be less than 24 hours old.
   Recheck current main CI, provider baseline, catalogue, configuration and Auth.
   Publish the **same ready draft ID** using the provider's restore operation.
   Verify actual published identity, public marker, runtime, Auth, all media bytes
   and real desktop/mobile playback before reporting success.
4. **rollback** (`ROLLBACK DEMO`): supply the original prepared record. Require the
   current published ID to be either that record's baseline or candidate; refuse
   an unrelated deployment. Recheck unchanged catalogue and provider configuration
   and the immutable baseline marker. Restore the original ready deployment and
   verify its runtime, marker and Auth. Candidate health and QA are deliberately
   not prerequisites to recovery.

There are no checkout, payment, inbox or customer edits in this maintenance scope.
The production-context draft has production service bindings: browser verification
allows only same-origin GET/HEAD and blocks service workers and mutations. Playback
evidence means actual sampled play/seek/caption/transcript observations, not a claim
that every video was watched or its audio listened to end-to-end.

## Failure handling and evidence

The workflow always attempts to retain its small `baseline.json` transition state
and immutable `record.json`. Before and after a provider write, it records the
requested phase and actual provider readback, including partial draft IDs. A failed
write can still have changed provider state. Preserve the actual artifact and
reconcile; do not blindly retry, assume no writes, or invent a passing record.

Artifact inputs accept exact identifiers, not a URL or local file. Their repository,
workflow, main branch, successful run/attempt, job time interval, archive digest,
canonical JSON hash and embedded producer must match. Private environment values,
provider tokens and raw CLI output are excluded from public evidence; configuration
and environment values are represented by hash commitments.

The record produced by `prepare` is the immutable input to every subsequent
operation. Later operation artifacts retain it unchanged alongside their own
transition state; use the original producer when identifying that record. Review
the actual terminal run plus the transition phase, not just an artifact's existence.

## Preserving the planned platform upgrade

The full-release implementation stays on main. No pending upgrade is discarded,
reverted or replaced by this maintenance branch. A later full release still uses
fresh exact-version catalogue and connected evidence under its existing workflow.

The current full-release promoter expects the previous app SHA to equal the
previous catalogue SHA. Therefore it cannot directly promote over this maintenance
app. Once that full release is ready, use the guarded maintenance rollback to restore
the original certified deployment immediately before the normal full promotion.
That brief interval restores the old demos. The subsequent full candidate must
include these new demo assets and player changes.

A later main commit may consume the old maintenance record only if the original
successful controller is an ancestor and the complete controller dependency closure
is byte-identical to current main. Every new operation still requires current-main
CI. If an upcoming change touches that closure, restore the maintenance baseline
before merging it, or review a versioned migration separately. Do not weaken the
old catalogue/runtime checks to accept unrelated application evidence.
