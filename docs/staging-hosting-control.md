# Isolated hosting-control rehearsal

This protected staging workflow gathers actual Netlify disable/enable behavior before the production billing reconciler may suspend a customer site. It does not activate the production hosting adapter, inspect billing details, or change a customer, database, domain, repository connection, or plan.

The source account and staging anchor are pinned to the existing `netlify-target-contract` checks. Every run creates at most one new `dc-host-<24-hex-nonce>.netlify.app` fixture with a unique static 200 page, `noindex` header, and no functions. An existing name is rejected. The controller verifies the returned site ID, account, hostname, creation time, empty domains/repository, and exact published deployment before issuing the official disable request. It records HTTP status and body hash plus only allowlisted scalar site state/disabled flags. It then enables the same site and verifies that the original 200 marker and `noindex` header are restored. It never deletes a site.

## Initial run

1. Review and merge the helper and workflow. Wait for successful **push CI on the exact current main SHA**. Keep main at that SHA until the fixture is restored; the workflow intentionally stops if main changes.
2. Generate a fresh nonce with `node -e "console.log(require('node:crypto').randomBytes(12).toString('hex'))"`.
3. Dispatch `.github/workflows/staging-hosting-control.yml` on `main` with `operation=rehearse`, the exact `release_sha`, the `fixture_nonce`, and confirmation `REHEARSE OWNED HOSTING FIXTURE`. Leave all source fields empty. The existing protected `staging` environment supplies its Netlify token and target identity. No new secrets are needed.
4. Review `staging-hosting-journal-<run-id>-<attempt>` and the final `journalHash` in the logs. Success is phase `restored`, disable/enable status 204, and final public status 200 with the exact original body hash. The fixture remains online with its tiny noindex page.

The journal is checkpointed before each mutation and preserved even when a later phase fails. Creation/deployment errors may leave an owned partial fixture; the workflow never adopts another site's identity or deletes anything to recover. Keep the original run, artifact ID, nonce, source SHA, and journal hash until review is complete. Artifacts are retained for 30 days.

## Failed-run inspection and one restoration attempt

Dispatch `operation=inspect` with the original rehearsal's exact nonce, SHA, run ID, artifact ID, and canonical journal hash. Inspection changes no provider state. It requires verified creation provenance and a recorded deployment; partial creation journals remain diagnostic only.

If the original rehearsal stopped after a persisted disable intent, use `operation=restore` with that same immutable source and confirmation `RESTORE OWNED HOSTING FIXTURE`. Recovery only enables the exact original site and unchanged published deployment. It does not create, upload, disable again, or accept a caller-supplied site ID. If the original marker is already restored, it issues no provider mutation. Known rejected disable responses, a provider 422 enable block, completed rehearsal sources, and changed identity/deployment are rejected.

Only **one restoration workflow run and one attempt** are permitted for a nonce. The controller checks complete GitHub workflow-run history before restoration and before enable. A second dispatched restoration, a rerun, missing history, or truncated history fails closed. Preserve a failed restoration journal for review; do not rerun it or replay the older source. Main advancing or a restoration that remains unconfirmed requires a separately reviewed recovery change. The controller does not promise unattended recovery from every provider failure.

## Reading the evidence

A 204 confirms endpoint acceptance. A subsequent non-2xx status with a different body hash records that this fixture was not serving its original content at that observation. A 503, 429, or 404 alone is not a universal disabled-state proof. Transport errors and redirects cannot satisfy the unavailable check; redirects are recorded without following them. The arbitrary `Site.state` string and supported boolean fields are observations, never invented enums.

Review the complete before/after/restored sequence and actual provider flags before implementing a production readback observer. This rehearsal's success does not itself authorize customer suspension or prove an account-level cost ceiling. The production hosting adapter remains disabled until its distinct claimant, journal, observer, and billing-entitlement integration are tested.

Provider references: [disableSite](https://open-api.netlify.com/#tag/site/operation/disableSite), [enableSite](https://open-api.netlify.com/#tag/site/operation/enableSite), [createSiteInTeam](https://open-api.netlify.com/#tag/site/operation/createSiteInTeam), [GitHub workflow runs](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow).

Local verification: `node --test apps/generator-app/scripts/staging-hosting-control.test.mjs`.
