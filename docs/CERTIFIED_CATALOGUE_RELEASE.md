# Certified catalogue release and rollback

This is a prepared release path. No production promotion, connected purchase, received delivery email, or production rollback has been proved by adding it. Current GitHub CI billing, protected staging-branch access, provider credentials, and full 5,486-template certification remain independent gates. A pilot or Netlify preview cannot satisfy them. Booking Kit sales remain disabled.

The production workflow defaults to `verify`, runs only from `main`, and uses the protected production environment. Promotion requires a successful **GitHub CI push run for that exact main SHA**, explicit `PROMOTE CERTIFIED`, the approved certification digest, and separately approved connected staging evidence. The curated 60-template export is never a promotion input; it is retained only as verified rollback material.

## Prepare the exact bundle

After the compiler's full run and `promote --dry-run` pass, retain its content-addressed `library` and `promotion-dry-run.json`. From a clean checkout of the tested commit, run:

```sh
node apps/generator-app/scripts/certified-catalog-release.mjs prepare \
  --root /absolute/certified/library \
  --plan /absolute/certified/promotion-dry-run.json \
  --receipt /absolute/certified/certification.json
```

Keep artifacts outside the checkout. The command checks the actual Git HEAD, every final browser receipt and artifact tree, exact 5,486 mappings, source preservation, zero neutral replacements, and complete customization coverage with zero diagnostics. Each sealed deployable file must match its browser-receipt tree, including when files change between validation and collection. The receipt binds commit, catalogue/manifest hashes, full-gate bytes, template evidence, and all deployable bytes. It is a digest-bound review record, not a cryptographic signature or a substitute for reviewing the underlying evidence.

Preserve a GitHub Actions artifact containing `library/`, `promotion-dry-run.json`, `certification.json`, and `connected-staging.json`. The artifact transport must retain the exact bytes and relative paths; the workflow verifies them again. Its artifact run ID and artifact ID identify the bundle. No artifact has been created or uploaded by this preparation.

The operator's `connected-staging.json` must contain the same `releaseSha`, `catalogHash`, `manifestHash`, canonical `certificationHash`, an ISO `reviewedAt`, an HTTPS `evidenceUrl`, and `checks` with `stripe`, `email`, `provisioning`, `previewEditing`, `refundRecovery`, and `rollback` each set to `passed`. These fields must describe retained, actual connected evidence; do not mark fixture tests as passed provider checks. Supply the file's raw SHA-256 separately in the promotion dispatch. They are required operator attestations, not automated provider probes.

## Environment identity and sequencing

Staging may use Netlify's `production` build context only when runtime `DAILYCLARITY_ENVIRONMENT=staging`, `SITE_ID` equals `DAILYCLARITY_STAGING_SITE_ID`, and that site is not production. Set the staging profile variable to `rehab-staging` in builds/functions; mirror it in protected GitHub `vars.DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE` for the deployment configuration check. The explicit production ban on staging profiles remains.

For the future certified production deployment, configure `DAILYCLARITY_ENVIRONMENT=production` and `DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE=rehab-certified` in builds/functions on the pinned production site `4a98d266-bb9f-44ab-bf27-30597d741705`. The workflow verifies these future deployment settings, matching production schemas, and sales disabled before writes. Netlify function environment values are captured per deployment, so configuring a future deployment does not turn an already deployed launch application into a certified application. [Netlify environment behavior](https://docs.netlify.com/build/functions/environment-variables/).

Promotion performs these steps:

1. Verify the receipt and clean checkout; capture the previous deployment ID/SHA and pointer. For an initial launch baseline, rehash every remotely stored template file against the approved artifact receipts and seal an aggregate byte digest.
2. Upload all immutable `catalogs/<hash>/` objects and certification to the separate `templates-rehab-certified` store. Rehash actual readback bytes with bounded concurrency. Leave the serving pointer unchanged.
3. For the first transition only, persist the rollback journal and activate the certified pointer while the previous launch application continues serving its original store. Then publish the tested application. For later releases, publish the tested application against the existing usable certified catalogue, then switch its pointer last.
4. Associate the resulting deployment ID with the durable rollback journal, including when the deployment command reports failure after publication. Netlify CLI deployments do not populate Git `commit_ref` consistently. The workflow generates `public/__dailyclarity_release.json` from the actual clean HEAD and approved certification before build. Binding checks its deployed immutable SHA-1 through the authenticated Netlify file API, checks deployment/site identity, and rechecks the published deployment ID. A present `commit_ref` must also match. Application health is not required for this proof.
5. Attest the final site, database, release SHA, profile, 5,486 count, catalogue hash, manifest hash, and certification hash. Preserve `rollback.json` as a workflow artifact even on failure. Inspect its canonical digest before authorizing rollback.

No live mutation is done by `prepare` or `verify`. Separate CLI operations are `capture`, `stage`, `bootstrap`, `publish`, `bind`, and `rollback`; `run-certified-promotion.mjs` supplies the reviewed sequence. Use the protected workflow rather than ad hoc activation. Keep Netlify auto-publishing disabled so another deployment cannot race this manual release.

## Explicit rollback

Dispatch `rollback` with the artifact containing `rollback.json`, its approved canonical SHA-256, and `ROLLBACK CERTIFIED`. It does not require healthy application functions or current CI. The command verifies the pinned Netlify site/current deployment, the record, and the previous immutable snapshot, restores the pointer, then restores the recorded deployment through Netlify's API. Certified objects are checked against the sealed aggregate digest, so changing both bytes and their metadata cannot pass. Launch baseline objects must still match their original approved artifact hashes and captured aggregate. [Netlify restore-deploy API](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/#restore-deploy-rollback).

The pointer and deployment are separate provider operations. A failure between them leaves the durable journal available for an explicit retry; no automatic blind rollback or deletion of historical snapshots occurs. A changed or unrelated current deployment/pointer, incomplete journal, unavailable immutable release proof, or corrupt historical snapshot stops the operation. Keep both previous deployment and all referenced objects until the new release has been verified.
