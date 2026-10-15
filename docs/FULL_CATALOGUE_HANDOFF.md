# Complete Windows catalogue to protected deployment

This path transfers the actual completed 5,486-template output. It does not substitute the 60-template baseline, rerender templates, weaken browser/customization gates, create provider evidence, or publish a release automatically. The repository is public: upload only the reviewed template library and sanitized evidence. Never include a compiler ledger, whole workRoot, `.env`, tokens, private browser state, email bodies, checkout/authentication URLs, or provider responses.

Merge application and workflow changes before choosing the final main SHA. Certification, successful push CI, staging application, connected evidence and production must all identify that exact SHA. If main changes, prepare a new reviewed certification using the existing compiler provenance procedure; do not edit an old receipt or report.

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

A scoped recovery rehearsal can use a newly created task-owned Netlify site at the exact reserved test slug before card entry, with one unique task-owned non-Netlify alias. The real staging provisioner rejects that alias, causing an actual signed payment event to enter failed fulfillment. Capture the exact event/order/intent failure first. Then remove only that fixture alias after rechecking the recorded site/account/name and unchanged singleton alias set; let the normal sweeper or protected admin retry resume the exact event. Verify the same deterministic site is reused, with no second order/site, and complete actual email/customer checks. Create no fixture if the deterministic site already exists; do not proceed with payment unless the provider accepted and independently read back the intended isolated fault. This is a proposed connected procedure, not an executed result. Do not edit database success rows into failure or submit fabricated webhook payloads.

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

The finalization run/artifact IDs now fit the existing production `deploy.yml` inputs exactly. Use production `verify` first, then the existing reviewed promotion procedure. Production promotion retains its own rollback record and full target/schema/CI/catalogue gates. These workflows prepare the route; successful real executions remain required.

References: [GitHub release assets](https://docs.github.com/en/rest/releases/assets), [release limits](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), [draft releases](https://docs.github.com/en/rest/releases/releases), [upload-artifact hidden files and immutable IDs](https://github.com/actions/upload-artifact).
