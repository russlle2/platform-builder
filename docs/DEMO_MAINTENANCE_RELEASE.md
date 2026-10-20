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

The adapter build uses `--context production`. Provider runtime context is
separate from that build setting: a normal CLI draft is a deploy preview and
does not receive production-only Functions environment variables. The reviewed
uploader therefore creates an unpublished **production-context** deployment
under a publication lock on the actual healthy baseline.

The controller requires the baseline to be initially unlocked and Git builds
stopped. It journals and acquires the lock, independently confirms it, then
invokes a fixed helper inside CLI 27.4.2's pinned installation. The helper uses
native, non-retried creation with `draft:false` and no branch, and refuses a
candidate unless the provider reports production context, the exact site/title,
and no publication. It preserves the returned ID before packaging or uploading.
It uses the pinned CLI's existing packager, adapter config, routing parsers,
functions/edge bundles and deploy-blobs upload; it neither rebuilds with
credentials nor copies production secrets. The normal CLI's interactive
production-unlock behavior is not invoked or modified.

The existing production function cache must remain intact and inside the pinned
packager's age window; otherwise preparation fails rather than silently repackaging
with a different runtime. Baseline lock and unpublished candidate checks run
around creation, blobs, package finalization and upload. The child checkpoint
retains only fixed phases, bounded failure categories and sanitized identities.

The separate commands also require a configuration handoff. CLI 27.4.2 saves its
resolved adapter configuration with absolute filesystem paths; copying that TOML
unchanged makes Linux paths resolve beneath the repository a second time. A fixed
controller helper runs inside the same pinned CLI environment, using its existing
TOML parser, serializer and offline config resolver. No dependency or lockfile is
added to the source or controller checkout. Only reviewed config versions 25.2.6
and 25.2.7 are accepted; their relevant resolver implementations were compared.

The helper converts recognized filesystem fields to repository-relative values
and omits the redundant repository-root base, preventing a second config lookup
from selecting the original root config. It preserves the generated file and
creates the package config exclusively, refusing to overwrite any existing file.
It then requires the complete production-context resolved configuration to remain
equivalent, including routing, headers, plugins, functions and environment. Only
fixed resolver provenance labels are excluded from that comparison. Unexpected
paths, different defaults, another selected config or any semantic change fail
before upload. The build record retains the generated/staged/semantic hashes,
actual config version and verification result; no configuration values or local
paths are included. A helper failure retains only an allowlisted operation phase.

Run the full offline integration locally with
`pnpm --package=netlify-cli@27.4.2 dlx node --test apps/generator-app/scripts/demo-maintenance*.test.mjs`.
Without that temporary CLI environment, the pure tests run and the optional pinned
resolver integration is explicitly skipped. Every actual preparation invokes the
helper and requires its independent offline equivalence proof before requesting a
draft. This proof does not replace provider, draft-runtime or media verification.

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
   read-only Auth readiness. Require stopped Git builds and an initially unlocked
   baseline. Acquire and retain its publication lock. Create a production-context
   candidate without publishing it; verify provider identity, marker, runtime and
   all 24 media bytes. The immutable record binds the acquired lock and runtime
   context. It is a result only after the run succeeds.
2. **verify-draft** (`VERIFY DEMO DRAFT`): supply the actual prepared record's
   `runId`, `runAttempt`, `artifactId`, `artifactDigest` and canonical `recordHash`
   in `record_source`. Verify live successful producer metadata and archive digest.
   Exercise all eight public routes at desktop/mobile widths and all six videos'
   play, seek, caption cues and transcript links. Fetch all 24 files and compare
   exact hashes, sizes and content types. Require the same baseline still locked
   before and after verification. Save the actual QA artifact.
3. **promote** (`PROMOTE DEMO DRAFT`): supply the same record and actual QA producer,
   artifact digest and canonical `qaHash` in `qa_source`. QA must be from a successful
   protected run, refer to the exact record/deployment and be less than 24 hours old.
   Recheck current main CI, provider baseline, catalogue, configuration and Auth.
   Publish the **same ready candidate ID** using the provider's restore operation
   while the baseline remains locked. Restore transfers that lock to the candidate.
   Verify actual published identity, public marker, runtime, Auth, all media bytes
   and real desktop/mobile playback. Only then unlock the exact published candidate
   and verify publication/marker again before reporting success.
4. **rollback** (`ROLLBACK DEMO`): supply the original prepared record. Require the
   current published ID to be either that record's baseline or candidate; refuse
   an unrelated deployment. Recheck unchanged catalogue and provider configuration
   and the immutable baseline marker. If currently unlocked, acquire the lock on
   the exact allowed published deployment. Restore the original ready deployment
   under that lock, verify its runtime, marker and Auth, then unlock that baseline.
   Candidate health and QA are deliberately not prerequisites to recovery.

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
An interrupted operation may leave the actual baseline or candidate locked. Do
not automatically unlock it: first establish all returned candidate identities,
upload completion, current publication and the exact retained operation. In
particular, a failed preparation without a prepared record is not eligible for
record-based promotion or rollback. Preserve its checkpoint and reconcile the
owned lock separately before starting any new preparation. Never unlock while
an upload or transition remains active or ambiguous.

Artifact inputs accept exact identifiers, not a URL or local file. Their repository,
workflow, main branch, successful run/attempt, job time interval, archive digest,
canonical JSON hash and embedded producer must match. Private environment values,
provider tokens and raw CLI output are excluded from public evidence; configuration
and environment values are represented by hash commitments.

An upload failure additionally records bounded, allowlisted diagnostics derived
in memory from the pinned CLI's error output. Only fixed categories, numeric
status/length information and allowlisted process codes are retained. Unknown or
ambiguous errors stay unknown; raw output, paths, URLs and arbitrary provider
messages are never saved. These diagnostics do not change upload behavior,
authorize retries or establish that a provider defect has been corrected.

The Next.js adapter temporarily swaps its CDN output into `.next` during
`onPostBuild`, then restores the raw build directory during `onEnd`. A separate
prebuilt upload must therefore select the fixed package `.netlify/static`
directory explicitly. The controller checks that its complete file tree equals
the source `public` tree plus built `.next/static` files mapped to `_next/static`.
It requires the exact producer marker and all 24 sealed media files, rejects
symlinks and unexpected files, and records only fixed identity/hash/count fields.
The check runs after the credential-free build and again immediately before
upload. The helper passes that fixed directory to the pinned CLI packager; generated
routing, functions, edge functions, configuration equivalence and all remote
health/media checks remain required. Raw server build output is never an
acceptable static upload directory.

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
