# Template audit — 2026-10-14

The checked-in 60-template curated catalogue can be reproduced exactly and passes its upload validation. The original 5,486-template catalogue cannot be certified in this workspace because its source files, compiler ledger, browser evidence, and release bundle are absent. The two catalogues are different release inputs; the curated catalogue is not a substitute for the original catalogue's certification.

## Inventory

Audited source: `58fa9368`, on branch `codex/paypal-sandbox-launch-20261014` before this session's changes. The original catalogue directory and generated/public mirrors are deliberately excluded from Git by `.gitignore`.

| Niche | Checked-in foundations / reproducible curated templates | Original templates required by v3 contract |
| --- | ---: | ---: |
| Aromatherapy | 12 | 1,292 |
| Holistic medicine | 12 | 1,002 |
| Private practice therapist | 12 | 1,087 |
| Sound bath | 12 | 1,001 |
| Wellness coach | 12 | 1,104 |
| **Total** | **60** | **5,486** |

The curated export contains 360 HTML pages, six per template, and 600 deployable files. Its additional `curated-report.json` is a local receipt, not a deployable template. Exported HTML references 74 distinct Unsplash image URLs; offline generation does not imply every rendered image is locally vendored. No remote-image availability claim is made by the static export check.

## Checks performed in this session

All commands ran from the repository root on Node.js 24.19.0. Generated files and logs were kept outside the checkout.

| Check | Result |
| --- | --- |
| Factory TypeScript: `pnpm --filter @platform/template-factory lint` | Passed |
| Full deterministic curated export | Passed: 60 templates, 12 per niche |
| Curated uploader dry run | Passed: 60 publishable templates, zero quarantined; 600 files, approximately 2.1 MiB |
| Uploader contract/security tests | Passed: 31 tests, zero failures or skips |
| Certified-release/rollback tests | Passed: 13 tests, zero failures or skips |
| Full template-factory test suite, including Chromium fixtures | Passed: 419 total, 416 passed, zero failed, three skipped; 54.7 seconds |

The three factory skips are explicit environmental limits: two tests need the absent real legacy corpus (`LEGACY_CORPUS_SMOKE_ROOT` / real-foundation census), and one Windows-only test exercises junction handling. The browser-backed fixture tests ran with Playwright Chromium 148. Fixture results do not certify absent original templates.

The curated report SHA-256 is `e3fd5bbf7dc43e3b7707f69905ac4a124820a1e9aa09fe9bcb3aebd7e14bfb22`, exactly matching the checked-in approved launch contract. The template-identity digest is `cfd79e167556e530db3e3ea0ed251473845031b69f684f7edfd93f18c9c74952`. The uploader also validates all template artifact hashes against the approved receipt. Its dry run explicitly reported that no credentials were loaded and no writes were performed.

Reproduce the baseline checks with a new output directory:

```sh
pnpm --filter @platform/template-factory export:curated -- --output /absolute/path/to/curated-audit
node apps/generator-app/scripts/upload-templates-to-blobs.mjs --root /absolute/path/to/curated-audit --dry-run
pnpm --filter @platform/template-factory lint
pnpm --filter @platform/template-factory test
node apps/generator-app/scripts/upload-templates-to-blobs.test.mjs
node apps/generator-app/scripts/certified-catalog-release.test.mjs
```

Session artifacts:

- `/workspace/dailyclarity-curated-audit-20261014/` — exact reproducible curated export.
- `/workspace/template-curated-upload-dry-run-20261014.log` — upload-plan validation.
- `/workspace/template-factory-tests-20261014.log` — factory suite output.
- `/workspace/template-uploader-tests-20261014.log` — uploader suite output.
- `/workspace/template-certified-release-tests-20261014.log` — certification and rollback fixture tests.

## Original catalogue certification status

`DEFAULT_LEGACY_RULE_VERSION` is `legacy-rehab-1.0.36`. The repository's [compiler history](legacy-catalog-rehabilitation.md) reports:

1. Rule 1.0.34 completed a full browser census but failed preservation because 212 templates used neutral replacements.
2. Rule 1.0.35 repaired those 212 originals in a targeted regression, but its subsequent 100-template pilot failed preservation on a mobile header case. No full rule-35 run was launched.
3. Rule 1.0.36 fixes that header case; its affected eight-page original passed 16 desktop/mobile views. The original 212-template regression, a fresh zero-fallback pilot, and complete certification still remain required in the checked-in handoff.

These are historical statements from the repository, not newly verified original-catalogue results. This workspace contains none of the referenced external history directories or compiler receipts. Unit tests and a restored curated export cannot establish the missing original-source lineage or complete browser matrix.

The source contract requires exactly 33,962 original HTML pages and 33,963 emitted pages, including one generated missing home page. Certification must retain all 5,486 original slugs through canonical/alias mappings, verify every page at desktop and mobile sizes, and finish with zero neutral replacements and zero customer-customization diagnostics.

## What is needed to finish the original catalogue

Restore the complete immutable original source and its matching durable work directory, or supply an already completed verifiable certification bundle. The documented Windows locations are:

```text
Source: C:\Users\chris\platform-builder\platform-builder
Work:   C:\Users\chris\Documents\DailyClarity\template-rehab
```

Before resuming an existing work directory, inspect its current ledger, rule version, source hash, and checkpoint instead of mixing runs or deleting prior evidence. With the current source and rule confirmed, the existing compiler provides the required sequence:

```sh
pnpm templates:legacy inventory --source /absolute/original-library --work-root /absolute/rehab-work
pnpm templates:legacy pilot --resume --source /absolute/original-library --work-root /absolute/rehab-work --pilot-size 100
pnpm templates:legacy run --resume --source /absolute/original-library --work-root /absolute/rehab-work
pnpm templates:legacy report --source /absolute/original-library --work-root /absolute/rehab-work
pnpm templates:legacy promote --dry-run --source /absolute/original-library --work-root /absolute/rehab-work
```

Run these only against the actual restored original catalogue. The 60-template export will not satisfy inventory and must not be expanded with synthetic duplicates to meet the count. Compiler work must remain outside both the source directory and the repository. Cloud repair is optional and was not enabled or used in this session.

After the full gate passes, follow [the certified release procedure](CERTIFIED_CATALOGUE_RELEASE.md) to bind the exact clean commit and retained browser receipts, validate connected staging, publish immutable objects, and preserve the rollback journal. No production template upload, catalogue-pointer change, connected checkout, or production rollback was performed by this audit.
