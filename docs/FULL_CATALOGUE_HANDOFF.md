# Complete Windows catalogue to protected deployment

This path transfers the actual completed 5,486-template output. It does not substitute the 60-template baseline, rerender templates, weaken browser/customization gates, create provider evidence, or publish a release automatically. The repository is public: upload only the reviewed template library and sanitized evidence. Never include a compiler ledger, whole workRoot, `.env`, tokens, private browser state, email bodies, checkout/authentication URLs, or provider responses.

Merge application and workflow changes before choosing the final main SHA. Certification, successful push CI, staging application, connected evidence and production must all identify that exact SHA. If main changes, prepare a new reviewed certification using the existing compiler provenance procedure; do not edit an old receipt or report.

## Automated preparation from a retained, reviewed original import

After an application change, `prepare-catalogue.yml` provides the normal **prepare → pack → upload** path using its own short-lived `GITHUB_TOKEN`. It runs only on main, behind the existing staging environment protection and catalogue-import concurrency. It requires the explicitly reviewed SHA to remain current main and have successful push CI before preparation, before each asset upload, and at final readback. Merge the application and this workflow first, then choose that final SHA. A draft for an older SHA must never be relabeled.

This route requires an unexpired original candidate and its provenance from the same successful `import-catalogue.yml` run. The previously reviewed original import is the trust anchor for retained compiler/browser evidence: its receipts do not independently identify the Windows compiler Git checkpoint. Review of that original checkpoint remains a prerequisite. The new workflow proves that the factory, the complete browser-renderer closure, dependency/install/configuration inputs and certification computations still match it. If those inputs changed, it stops; obtain newly produced and reviewed compiler/browser evidence through the original procedure below. It does not expand the guarded rebind workflow or the candidate-producer allowlist.

The retained original source identities are:

| Workflow input | Reviewed original value |
| --- | --- |
| `expected_release_sha` | **The new final 40-character main SHA after all intended merges and successful push CI** |
| `source_sha` | `2bc0bd7af293a1cf7de11821baa77ea11613506d` |
| `source_run_id` | `38780575189` |
| `source_artifact_id` | `11996673078` |
| `source_provenance_id` | `11996458556` |
| `source_artifact_digest` | `e5a6a145fe4913e01b283eb9c97e25c41053656fe4d63d0a95fd8edf047aee1a` |
| `source_receipt_hash` | `82adc1b86d5322c1bb5740b329d3bc1e22b88f4d779ac06fc79b3b46af891f79` |

Read back these exact artifact IDs and their unexpired state before dispatch. Expired/deleted artifacts, missing ancestry, failed CI or changed protected source inputs are concrete prerequisites to resolve, not reasons to weaken validation or substitute an unreviewed artifact.

The workflow checks provenance before downloading the large candidate. It verifies every original file and the unchanged promotion report, keeps the original certificate untouched, and moves the verified library/report into a new candidate directory on the same runner filesystem. This retains one expanded library rather than a second approximately 4.9 GB copy. It reruns the **current** customization verifier over all 5,486 templates, requiring exact catalogue/manifest hashes, complete page coverage and zero diagnostics. It then calls the normal certificate preparation and packer, requiring every evidence field except the new release SHA and every source content byte to match. Retained browser checks are explicitly reported as not repeated; current customization is reported as repeated.

Before packing, free-space checks reserve a conservative uncompressed tar/gzip bound plus 1 GiB headroom. Dependencies and artifact-download overhead must also fit the runner. Only the validated library, unchanged promotion plan and fresh certificate enter the transport. Original certificate/provenance, preparation diagnostics and repository files are never added to that archive.

Upload creates a new unpublished draft named `dc-transport-FULL_SHA-RUN_ID-ATTEMPT`. It uploads and downloads the exact canary first, then each bounded part, then the manifest last. Every asset is bound to its actual ID, size and SHA-256; absent provider digests require a byte download/hash. The workflow cannot publish, overwrite, delete, deploy or dispatch another workflow. A failed attempt may leave an unpublished partial draft; retain it for diagnosis. A rerun uses a new attempt identity, never `--clobber` or an older draft.

Download the small `catalogue-preparation-provenance-RUN_ID-ATTEMPT` artifact and review `catalogue-transport-report.json`. Its `workflowSha` and `transport.releaseSha` must equal the final main SHA. Record `transport.releaseId`, `canaryAssetId`, `manifestAssetId`, `manifestHash` and `certificationHash`. This is transport provenance, **not** an accepted candidate or connected-deployment pass.

Next run the unchanged importer with `operation=check-transport`, the reported release ID and canary ID; require its own protected-token readback success. Then follow section 3 with `operation=import` and the reported manifest/certificate identities. Sections 4 onward, including fresh connected checks for the changed application and all production gates, still apply. The local Windows transfer instructions below remain the route for newly compiled output or unavailable retained artifacts.

## 1. Prove normal GitHub draft access first

The standard GitHub Actions artifact REST API has no ordinary local-upload operation. Use supported `gh release create --draft` / `gh release upload` from the existing user login, then the protected importer uses its own short-lived `GITHUB_TOKEN`. Do not copy Actions runtime tokens or protected admin/provider credentials onto the laptop.

Before a large transfer, create a disposable draft on the exact final main SHA and upload one harmless file containing exactly this UTF-8 text and a single LF:

```text
DailyClarity catalogue transfer canary v1
```

PowerShell example, outside the checkout and compiler workRoot:

```powershell
$handoff = 'C:\Users\chris\Documents\DailyClarity\catalogue-handoff-FINALSHA'
New-Item -ItemType Directory -Path $handoff
$finalSha = 'ACTUAL_40_CHARACTER_FINAL_MAIN_SHA'
$tag = 'dc-transport-' + $finalSha.Substring(0,12)
[IO.File]::WriteAllText((Join-Path $handoff 'catalogue-transfer-canary.txt'), "DailyClarity catalogue transfer canary v1`n", [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $handoff 'transfer-notes.txt'), 'Unpublished, hash-verified catalogue transport. Do not publish.', [Text.UTF8Encoding]::new($false))
gh release create $tag --repo russlle2/platform-builder --draft --target $finalSha --title 'Unpublished catalogue transfer' --notes-file (Join-Path $handoff 'transfer-notes.txt')
gh release upload $tag (Join-Path $handoff 'catalogue-transfer-canary.txt') --repo russlle2/platform-builder
gh release view $tag --repo russlle2/platform-builder --json apiUrl,url,targetCommitish,isDraft,assets
```

Read the numeric release ID from the final segment of `apiUrl`; use `gh api repos/russlle2/platform-builder/releases/RELEASE_ID/assets` for the numeric canary asset ID. Retain both actual IDs from GitHub. Dispatch `import-catalogue.yml` on main with `operation=check-transport`, that release ID, and the canary ID in `manifest_asset_id`. The protected staging job requests draft access with its normal `GITHUB_TOKEN`; it makes GET requests only and downloads no user-provided URL. Require actual success and inspect the retained provenance showing `draftTokenAccessVerified:true`, `fullCatalogueVerified:false`. A 401/403/404 is a concrete auth/access failure; do not bypass it by exposing a token or publishing the draft. The canary cannot produce a candidate artifact.

The draft must stay unpublished and target the exact SHA. Do not use `--clobber`, delete/recreate approved assets, or reuse a transport tag for another SHA. Partial transfers can be resumed only when existing asset bytes and hashes match; mismatches require a new draft/identity. This guide does not claim the canary has already run.

## 2. Package the sealed output, read-only

Requirements are the existing Node 22–24 dependency installation and Python 3 standard library. Windows has been checked for real `C:\Python314\python.exe`; `CATALOGUE_PYTHON` can point there explicitly. Ubuntu Actions supplies Python 3. No package or lockfile change is required for the archive format.

Wait for the official full compiler and promotion dry-run to pass. The current Windows locations are:

- Library: `C:\Users\chris\Documents\DailyClarity\template-rehab\artifacts\promotion\CATALOG_HASH\library`.
- Plan: `C:\Users\chris\Documents\DailyClarity\template-rehab\reports\promotion-dry-run.json`.
- Certificate: the actual final-main certificate produced by the reviewed final SHA preparation, not an earlier executor certificate.

Copy these into a separate, new staging directory outside the checkout and active workRoot. The exact layout is:

```text
candidate/
  library/                  # all original files, including .dailyclarity/*
  promotion-dry-run.json     # unchanged source bytes
  certification.json        # unchanged final-main certificate bytes
```

Copy the actual library directory with hidden files retained, and verify the copy through the packer. Do not use a junction, symlink, hardlink, or copy screenshots/provider artifacts into it. The packer derives its allowlist from the fully validated manifest plus the two required browser receipt files per template; unexpected/private files fail the operation.

From a clean checkout of the final SHA:

```powershell
$env:RELEASE_SHA = $finalSha
$env:RELEASE_BUNDLE = Join-Path $handoff 'candidate'
$env:TRANSPORT_OUTPUT = Join-Path $handoff 'transport'
$env:RECEIPT_HASH = 'ACTUAL_REVIEWED_CANONICAL_CERTIFICATION_SHA256'
$env:CATALOGUE_PYTHON = 'C:\Python314\python.exe'
node apps/generator-app/scripts/catalogue-handoff.mjs pack
```

The packer revalidates the full catalogue, final browser receipts, exact file set and certification. It streams a standard gzip/tar archive into 256 MiB parts, emits `transport-manifest.json`, and reports its raw SHA256. Each part has its own length and SHA256; the manifest binds every expanded file. Files changing during packaging fail. It preserves original bytes, including line endings and JSON formatting.

Limits are 40 GiB expanded/archive, 500,000 regular files, 1,024 parts and explicit disk headroom. These bounds are deliberately finite; the completed output size must be measured. If the real output exceeds them, review and change the limit explicitly before certification; never truncate the library. Keep the original certified source and all parts until production and rollback retention are resolved.

Upload each part, then the manifest last, using the same draft and normal user auth:

```powershell
Get-ChildItem -LiteralPath $env:TRANSPORT_OUTPUT -Filter 'catalogue.part-*' -File | Sort-Object Name | ForEach-Object {
  gh release upload $tag $_.FullName --repo russlle2/platform-builder
  if ($LASTEXITCODE -ne 0) { throw 'Part upload failed; retain the existing draft and inspect exact asset IDs.' }
}
gh release upload $tag (Join-Path $env:TRANSPORT_OUTPUT 'transport-manifest.json') --repo russlle2/platform-builder
gh release view $tag --repo russlle2/platform-builder --json apiUrl,url,targetCommitish,isDraft,assets
```

GitHub release assets must each be under 2 GiB; fixed 256 MiB parts avoid this limit without estimating final library size. Do not upload `transfer-notes.txt`, arbitrary folders or local private state by wildcard.

## 3. Produce the immutable candidate artifact

Dispatch `import-catalogue.yml` on the final main SHA with `operation=import`, exact draft release ID, manifest asset ID, raw manifest hash and canonical certificate hash. It requires successful push CI on that SHA and the protected staging environment.

The importer checks draft/commit/repository identity, resolves parts to exact IDs in that release, downloads them by authenticated GitHub asset API, drops authentication before the provider's approved storage redirect, and checks every length/digest. It rechecks asset IDs afterward. Extraction validates every member/path/type/size/hash before creating any output file, rejects links, duplicates, traversal, extra files and expansion attacks, and writes only a new temporary directory.

It reruns complete certification verification and uploads `catalogue-candidate-SHA` using `include-hidden-files:true` on only the validated candidate directory. The separate provenance artifact retains source release/asset IDs, hashes, workflow SHA/run/attempt and final Actions artifact ID/digest. Record those actual IDs. The staging/finalization consumers independently validate the successful producer workflow and reverify the downloaded candidate, which also catches any transfer omission of hidden files.

## 4. Stage and rehearse using the exact candidate

Use `staging-catalogue.yml`, protected by the staging environment and `dailyclarity-staging` concurrency. Its default `verify` operation is read-only. Before stage, rollback or reapply, the operator stops all other checkout/browser runs and publishers for a coordinated, isolated TEST-only window. This coordination is not an application sales-pause claim. Check the previous deployment ID/SHA and keep Netlify Git auto-builds disabled; the runner requires the actual site API field `build_settings.stop_builds === true` before transitions. Manual publications outside this workflow must also remain stopped.

The first transition intentionally accepts the known healthy launch 60 baseline only. It preserves its deployment, launch manifest hash, raw previous rehabilitation pointer including absence, and the exact two public profile settings. It verifies all full-catalogue files and readbacks before activation, retains a durable journal, switches only the staging profile/pointer, and publishes the exact app commit. The launch store is not modified. Interrupted operations retain the journal and bind a published candidate using immutable deployment proof even when the deploy CLI reports failure.

Use explicit `rollback` / `reapply` with the retained journal artifact and its canonical hash. They operate only on owned recorded deployment/pointer/profile states; they do not recapture an unrelated baseline. Rollback restores the captured launch app/state, while reapply restores the bound full-catalogue candidate. A new unrelated publication or pointer change stops the operation. Review the actual runner result and runtime hashes after each direction. Local journal tests are not connected rollback proof.

Production target guards and `.github/workflows/deploy.yml` remain unchanged. This staging rehearsal does not claim a production rollback has happened. The separate Netlify pointer/environment/deployment writes cannot be made globally atomic; the retained journal and prewrite/readback checks support explicit recovery after a partial operation.

## 5. Obtain actual connected evidence, then finalize

Run the normal customer journey on `rehab-staging` with all 5,486 templates and exact independently reviewed catalogue/manifest hashes. Use the fresh protected runtime report and the final deployed SHA. The separate60-template test remains useful but cannot satisfy this release.

Require real Stripe test payment, exact database order/session/intent/event binding, provisioned site with HTTPS/noindex, received order/live emails, normal verified-email login, owned dashboard, editing/save/publish verified in actual public HTML, and the normal billing/contact/inbox journey. A sandbox provider acceptance or database send marker is not received email.

Then retain actual refund, retry/recovery and staging rollback/reapply evidence. Current Basic website refund events are not reconciled into a website refund state; they are dispatched through BookingKit handling and return for non-Kit payments. Test subscription cancellation is a separate action that does reconcile billing status, and a Stripe refund does not itself cancel a subscription. Do not mark `refundRecovery` passed merely because Stripe returned a refund or because a queue event succeeded. For Basic, record the approved test refund as provider financial evidence, separately cancel the exact test subscription and verify its signed webhook plus customer billing state, and prove genuine failed fulfillment recovers on the same order/site. Historical paid-order evidence may remain paid; do not invent automatic refund-driven cancellation or access revocation. Keep BookingKit sales disabled.

A scoped recovery rehearsal can use a newly created task-owned Netlify site at the exact reserved test slug before card entry, with one unique task-owned non-Netlify alias. The real staging provisioner rejects that alias, causing an actual signed payment event to enter failed fulfillment. Capture the exact event/order/intent failure first. Then remove only that fixture alias after rechecking the recorded site/account/name and unchanged singleton alias set; let the normal sweeper or protected admin retry resume the exact event. Verify the same deterministic site is reused, with no second order/site, and complete actual email/customer checks. Create no fixture if the deterministic site already exists; do not proceed with payment unless the provider accepted and independently read back the intended isolated fault. The protected `staging-recovery-proof.yml` workflow now provides scoped prepare, clear, inspect and exact-event retry controls; follow [the operator procedure](STAGING_RECOVERY_REHEARSAL.md). Workflow source and mocked tests are not evidence that the rehearsal has executed. Do not edit database success rows into failure or submit fabricated webhook payloads.

Store only sanitized underlying evidence in an unpublished GitHub draft release on the same SHA, or an actual successful same SHA repository workflow artifact. Exclude private checkout state, tokens, email bodies, cookies and raw provider objects. The operator reviews the real retained evidence and writes `connected-staging.json` with exactly the existing production contract fields:

```json
{
  "releaseSha": "ACTUAL_FINAL_SHA",
  "catalogHash": "ACTUAL_CERTIFIED_CATALOG_HASH",
  "manifestHash": "ACTUAL_CERTIFIED_MANIFEST_HASH",
  "certificationHash": "ACTUAL_CANONICAL_CERTIFICATION_HASH",
  "reviewedAt": "ACTUAL_ISO_REVIEW_TIME",
  "evidenceUrl": "EXACT_RETAINED_DRAFT_RELEASE_OR_SUCCESSFUL_WORKFLOW_RUN_URL",
  "checks": {
    "stripe": "ACTUAL_RESULT",
    "email": "ACTUAL_RESULT",
    "provisioning": "ACTUAL_RESULT",
    "previewEditing": "ACTUAL_RESULT",
    "refundRecovery": "ACTUAL_RESULT",
    "rollback": "ACTUAL_RESULT"
  }
}
```

This is an operator attestation bound to retained real evidence, not an automated provider certificate. No helper fills `passed` automatically. Finalization requires all six actual checks passed, matching hashes, review no older than 24 hours, and an evidence URL without private query/fragment data. A draft evidence URL must equal the exact metadata URL of the draft containing this report. If it points to a workflow run, that run must actually have completed successfully on the same main SHA. Neither location alone proves the claims: the separately approved raw report hash records the operator's review.

Upload only this small report to that unpublished release with normal `gh release upload` and retain its exact asset ID and raw SHA256. Dispatch `finalize-catalogue.yml` with candidate run/artifact IDs, certificate hash, connected release/asset IDs and report hash. It revalidates candidate provenance/full bytes, checks the report and creates a NEW `certified-catalogue-SHA` artifact with the original three paths plus `connected-staging.json`. It does not overwrite the candidate or mutate a provider.

### Protected upload of already reviewed connected evidence

`upload-connected-evidence.yml` is an additional upload route when the reviewed files are local. It uses its own short-lived `GITHUB_TOKEN` in the protected staging environment on exact current main with successful push CI. It shares finalization concurrency and uploads only two fixed asset names to an **existing, initially empty, unpublished exact-SHA draft**: `connected-staging-support.json` first, then the unchanged `connected-staging.json`. Create that separate empty draft through normal GitHub authentication and read its actual numeric ID and `html_url` before writing the report. Do not use the populated catalogue transport draft or construct a URL from a tag guess.

The uploader checks structure, consistency, approved bytes and retained workflow provenance. It does **not** independently verify provider truth, generate observations, turn booleans into `passed`, change a review timestamp, create/publish/delete releases, delete/overwrite assets, or dispatch finalization. The operator must review the actual complete journey and correlation before supplying either raw file hash. The finalizer and all existing gates remain unchanged.

Supporting JSON has exactly `version:1`, `releaseSha`, `catalogHash`, `manifestHash`, `certificationHash`, `observations`, and `gateEvidence`. Its release/hashes must match the reviewed report and actual certificate. Each of at most 64 observations has:

- `id`: `observation-1` through `observation-64`; `gate`: one of the six report gates.
- `kind`: `provider`, `browser`, `inbox`, `workflow`, or `source-review`; `executionMode`: `connected-test`, `no-stripe-simulation`, or `source-review`.
- `scope`: `current` or `historical`; `observedReleaseSha` and `observedAt`: the **actual original** observed SHA and UTC ISO timestamp. Historical, simulated and source-review observations may remain as unselected context. They cannot substitute for current connected evidence or be redated/rebound.
- `bindingHash`: a canonical SHA-256 commitment to the actual high-entropy journey/order/site identity tuple reviewed privately. Reuse the same commitment across related observations so reviewers can follow the same order/site and recovery. A separate staging rollback identity tuple may use its own commitment. Do not hash a bare email address, use an arbitrary per-record label hash, or publish the private tuple.
- `facts`: a nonempty object containing only the gate-specific boolean, bounded-count, hash or fixed-enum fields allowed by [connected-evidence-contract.mjs](../apps/generator-app/scripts/connected-evidence-contract.mjs). No arbitrary notes, inbox addresses, message bodies, auth/checkout URLs, cookies, raw provider IDs/objects or local file paths are allowed.
- Optional `source`: exactly `runId`, `runAttempt`, `artifactId` as numeric strings and `artifactDigest` as raw SHA-256. This is required for `kind:workflow`. The uploader checks the actual successful same-observed-SHA main workflow attempt and unexpired immutable artifact metadata/digest; the artifact creation must fall within that attempt. Preserve sanitized facts in the support file because a reference alone is neither observed evidence nor durable after artifact expiry.

`gateEvidence` maps each of the six gates to a nonempty list of distinct observation IDs from that gate. Every selected observation must be an actual `connected-test` on the **current final release** and have been available by `reviewedAt` (at most five minutes of clock skew). Preserve failed attempts and later successes as separate observations without editing the old facts. Selected facts must collectively provide the following existing handoff assertions; this consistency check does not establish that the supplied observations are true:

| Gate | Selected facts required to be `true` |
| --- | --- |
| `stripe` | `stripeTestPayment`, `signedWebhook`, `orderBound`, and a positive `amountMinor` |
| `email` | `confirmationEmailReceived`, `liveEmailReceived`, `authLogin` |
| `provisioning` | `orderBound`, `https`, `noindex` |
| `previewEditing` | `authLogin`, `ownedEditPersisted`, `deliveredContentMatched`, `republishMatched` |
| `refundRecovery` | `fulfillmentFailed`, `fulfillmentRecovered`, `sameOrderAndSite`, `noDuplicateOrder`, `refundConfirmed`, `subscriptionCanceled`, `billingStateConverged`, `signedWebhook` |
| `rollback` | `stagingRollback`, `stagingReapply`, `runtimeVerified` |

Optional typed facts can retain actual Stripe receipt arrival, recipient index `0`/`1`, private-account/public-contact separation, text/image/theme edits and failed-save/retry results. Their omission must not be filled with invented values. Provider acceptance is not inbox receipt; no-Stripe simulation is not a real test payment; refund confirmation is separate from subscription cancellation and recovery of the same order/site.

Run local validation **before sending any payload to GitHub**, using Node 22–24 and the repository dependencies. Keep all files outside the checkout. Substitute actual reviewed paths/identity values:

```sh
node apps/generator-app/scripts/upload-connected-evidence.mjs validate \
  --report /absolute/reviewed/connected-staging.json \
  --support /absolute/reviewed/connected-staging-support.json \
  --certificate /absolute/reviewed/certification.json \
  --release-sha ACTUAL_FINAL_MAIN_SHA \
  --draft-url ACTUAL_DRAFT_HTML_URL \
  --release-id ACTUAL_NUMERIC_EMPTY_DRAFT_ID \
  --output /absolute/reviewed/connected-evidence-dispatch.json
```

This command makes no network requests. It refuses duplicate JSON keys, malformed UTF-8, unknown/private fields and inconsistent reports; it prints only identities, digests and payload size. It writes the optional dispatch file exclusively after validation and never sends it. Report/support bytes stay unchanged. Report size is at most 16 KiB, support 32 KiB and certificate 4 KiB; the complete encoded dispatch must also remain **below 60,000 bytes**, safely below GitHub's aggregate input limit. The certificate is bound by its canonical hash; report/support require separately reviewed raw hashes. Canonical base64 is validated again by the workflow.

After reviewing the local results and confirming current main/CI, submit that exact payload through the normal workflow-dispatch API and complete the protected environment review. The payload includes `ref:main` and the seven exact workflow inputs; the helper never performs this dispatch. Inputs are read from `GITHUB_EVENT_PATH`, not interpolated into shell commands or the displayed step environment.

Both uploaded files receive actual byte download/readback checks. The report is never uploaded after failed support validation/readback. A partial failure may leave support or report assets in an unpublished draft; retain that draft for diagnosis, create a new empty one, update and review the actual draft URL/report raw hash, and rerun local validation. Never resume by deleting or clobbering reviewed assets.

Review the small `connected-evidence-upload-provenance-RUN_ID-ATTEMPT` artifact. It binds the actual draft ID/URL, both asset IDs/raw hashes and the unchanged report/certificate identity, while explicitly stating that provider observations were not independently verified. Supply its `releaseId`, `report.assetId`, and `report.sha256`, plus the independently approved candidate IDs/certificate hash, to the existing finalizer. Successful upload is transport evidence; it is not a connected-gate pass or deployment.

The finalization run/artifact IDs now fit the existing production `deploy.yml` inputs exactly. Use production `verify` first, then the existing reviewed promotion procedure. Production promotion retains its own rollback record and full target/schema/CI/catalogue gates. These workflows prepare the route; successful real executions remain required.

References: [GitHub release assets](https://docs.github.com/en/rest/releases/assets), [release limits](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), [draft releases](https://docs.github.com/en/rest/releases/releases), [upload-artifact hidden files and immutable IDs](https://github.com/actions/upload-artifact).
