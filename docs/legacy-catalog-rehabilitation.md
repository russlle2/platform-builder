# Legacy Catalogue Rehabilitation Compiler

This compiler turns the legacy catalogue into a verified catalogue-v3 library without editing the source templates. It is intended to run unattended and resume after a process failure, sign-out, or Windows restart. Rehabilitation and publication are deliberately separate operations.

## Scope and invariants

The only in-scope source directories are the five active niches below. Inventory fails if their expected counts do not add up to exactly 5,486 templates.

| Source niche | Expected templates |
| --- | ---: |
| `aromatherapy` | 1,292 |
| `holistic_medicine` | 1,002 |
| `private_practice_therapist` | 1,087 |
| `sound_bath` | 1,001 |
| `wellness_coach` | 1,104 |

The 46 dental, HVAC, and injury-law experiments are out of scope and are never selected by inventory. The 60 already-curated templates remain the live baseline until a separately reviewed publication workflow replaces the manifest.

The legacy source root is read-only by contract. The compiler refuses overlapping source and work roots, hashes every source file, rechecks a template's tree hash after repair, re-inventories the complete catalogue before declaring a run successful, and writes all state beneath the work root. Do not point `-WorkRoot` at the catalogue, repository, a parent of either, or a cloud-synced source copy.

Recommended Windows paths:

```text
source: C:\Users\chris\platform-builder\platform-builder
work:   %LOCALAPPDATA%\DailyClarity\template-rehab
```

## Architecture

The work root is the durable boundary for the run:

```text
template-rehab/
├── ledger.sqlite                 SQLite job ledger (WAL mode)
├── artifacts/
│   ├── candidates/               immutable, content-addressed template outputs
│   ├── receipts/                 browser-backed quality receipts
│   └── promotion/                staging-only catalogue mirrors
├── blobs/sha256/                 de-duplicated emitted file content
├── renders/
│   ├── thumbnails/               compact passing evidence
│   └── failures/                 full screenshots retained for failures
├── reports/                      inventory, pilot gate, catalogue v3, audit, contact sheet
├── logs/                         structured compiler events
└── runner-logs/                  PowerShell runner output
```

The ledger tracks runs, templates, pages, issues, transformations, renders, dedupe clusters, aliases, artifacts, and model usage. Jobs carry a source hash, rule version, attempts, stage, lease owner/expiry, and terminal disposition. Writes are atomic; leases make an interrupted `run --resume` safe to continue. A work-root lock also enforces one compiler writer at a time, detects a live owner by PID, and safely clears stale locks after an interrupted process.

The pipeline proceeds in this order:

1. Inventory and hash the immutable source.
2. Repair deterministically with `parse5`, PostCSS, the known foundations, page-role adapters, claim/form/script safety rules, canonical manifests, and local asset vendoring. When legacy generation duplicated one inner page across several filenames, each copy is rebuilt through its own semantic role adapter rather than preserving mislabeled content.
3. If a candidate still cannot pass static safety, substitute a vetted niche-specific neutral template with the same page set. The original source and the reason remain in the audit lineage.
4. Render every emitted page at 1440×900 and 390×844 in isolated Chromium contexts. External requests are blocked. The gate checks page and console errors, requests, links/assets, visible structure, overflow, forms, accessibility, sentinel hydration, ID-targeted editing, and computed theme changes.
5. Separate canonical design, content preset, and theme preset. A foundation marker identifies one of 60 trusted lineage families, but it is not by itself proof of design equivalence. Foundation variants alias only when their post-repair design/composition hash and editable slot contracts match exactly. Incompatible variants remain distinct designs. Irregular variants alias only when page roles and niche match and all strict DOM/SSIM/perceptual-hash thresholds pass.
6. Emit one quality receipt and one catalogue mapping for every source slug.

Passing aliases do not erase content. Each legacy slug retains its own content/theme preset and lineage while the public gallery displays one representative for each canonical `designId`. This fail-closed policy can legitimately produce more than 60 public designs from the 60 foundation families; preserving every editable text and image slot takes precedence over an artificially small gallery count.

The rule-version 1.0.4+ foundation census repaired all 4,937 foundation-marked sources and formed 1,202 safe canonical clusters plus 3,735 compatible aliases. All 4,937 passed self/canonical composition checks. It rebuilt 13,159 role-adapted pages and reduced the 8,224 raw byte-redundant inner pages to zero duplicate-role outputs. These counts are verification evidence for this source snapshot, not hard-coded targets for a future changed catalogue.

## Commands

Run commands from the repository root. Always pass an explicit source and work root when invoking the CLI directly:

```powershell
$source = 'C:\Users\chris\platform-builder\platform-builder'
$work = Join-Path $env:LOCALAPPDATA 'DailyClarity\template-rehab'

pnpm templates:legacy inventory --source $source --work-root $work
pnpm templates:legacy pilot --resume --source $source --work-root $work --pilot-size 100
pnpm templates:legacy run --resume --source $source --work-root $work
pnpm templates:legacy status --source $source --work-root $work
pnpm templates:legacy report --source $source --work-root $work
pnpm templates:legacy promote --dry-run --source $source --work-root $work
```

The PowerShell runner supplies those paths on every invocation, prevents automatic system sleep while work is active, writes an operator log, and retries a failed full run three times by default. A retry always includes `--resume`.

```powershell
.\scripts\run-legacy-rehab.ps1 -Command inventory
.\scripts\run-legacy-rehab.ps1 -Command pilot
.\scripts\run-legacy-rehab.ps1 -Command run
.\scripts\run-legacy-rehab.ps1 -Command status -Json
.\scripts\run-legacy-rehab.ps1 -Command report
.\scripts\run-legacy-rehab.ps1 -Command promote
```

`promote` is automatically constrained to `--dry-run`; neither the runner nor compiler has a live-publish command. Use the same `-RuleVersion`, source, and work root for inventory, pilot, run, report, and dry-run promotion. Changing the rule version intentionally creates a new processing identity and requires a new pilot.

Prerequisites are Node.js 22–24, the repository's pinned pnpm version, installed dependencies, and Playwright Chromium. Install the browser once if it is absent:

```powershell
pnpm --filter @platform/template-factory exec playwright install chromium
```

### Safe unattended scheduling

First run inventory and the 100-template pilot interactively. Only after the pilot gate passes, preview the task definition:

```powershell
.\scripts\install-legacy-rehab-task.ps1
```

Preview mode does not register anything. To register it deliberately:

```powershell
.\scripts\install-legacy-rehab-task.ps1 -Install
```

The task runs as the current user at logon, with limited privileges, unlimited execution time, battery-safe settings, wake-to-run, a single-instance policy, and 12 five-minute restart attempts. Its runner resumes the matching ledger and prevents automatic sleep while active. No password is stored, so it requires that user's interactive logon token. If this worktree is moved, preview and reinstall the task so its script path is correct. Updating an existing task requires both `-Install` and `-Replace`.

Disable or remove the task after the full run succeeds so a later logon does not perform an unnecessary inventory pass.

To remove it later:

```powershell
Unregister-ScheduledTask -TaskName 'Daily Clarity Legacy Catalogue Rehabilitation' -Confirm
```

## Catalogue v3 and editability

Catalogue v3 maps every legacy slug to four independently versioned facts:

```ts
type CatalogTemplate = {
  legacySlug: string
  designId: string
  contentPresetId: string
  themePresetId: string
  niche: string
  qualityReceipt: string
}
```

Every editable text node has a deterministic `data-dc-edit-id`; every image and meaningful CSS background has a deterministic `data-dc-image-id`. Preview, checkout, portal persistence, deployment generation, and later editing target those IDs first. Existing catalogue-v2 drafts remain compatible through original-string/source fallback fields.

“Complete” therefore means more than rendering: each slug must resolve to a passing canonical design or passing alias, and its IDs must survive composition and persistence. Browser QA performs ID-targeted text and theme mutation checks and requires image slots to remain unique, local, and renderable; application tests cover ID-based text/image persistence through preview, checkout, portal storage, and deployment generation. A neutral fallback is also fully ID-editable; it exists to preserve coverage without publishing unsafe or broken legacy content.

## Model and token policy

Inventory, parsing, repair rules, asset rewriting, rendering, accessibility checks, hashing, and deduplication use zero OpenAI tokens. The normal pipeline is deterministic and can complete with the neutral fallback even when no API key is present.

The isolated cloud-repair module is reserved for unresolved DOM fragments only. The normal CLI commands do not call an external model automatically; enabling that lane requires an explicit operator integration and credential. It is not permission to send whole templates. The module enforces:

- model `gpt-5.6-terra` through Responses batch requests;
- structured JSON patch operations against supplied node IDs;
- one reusable recipe per matching issue fingerprint;
- no more than two attempts per fragment;
- no more than 1,000,000 total tokens and no more than $25 accounted spend;
- deterministic neutral fallback when either ceiling would be crossed.

Usage reservations and actual usage are reconciled in the ledger. Do not add an API key to the scheduled-task command or logs. Cloud escalation must remain an explicit operator decision; a deterministic run needs none.

## Gates and evidence

The 100-template stratified pilot covers foundations, topologies, issue families, and generation cohorts. Full processing is blocked unless the current rule version has a passing pilot with no critical defects, less than 2% deterministic failure, and every selected template passing the stricter current gate.

For each page and viewport, the final gate requires no unresolved tokens, sample contacts, unsupported claims/proof, unsafe form fields, missing local assets, broken internal links, exceptions, failed requests, blank content, overflow above one pixel, duplicate edit IDs, or critical/serious Axe findings. Navigation, standardized forms, sentinel profile hydration, ID-targeted editing, and theme-variable mutation are tested through the same local serving path used for customer preview composition.

Inventory findings describe the immutable source and remain available in transformation history. They are marked resolved only after the repaired candidate earns a complete browser-backed receipt, so the final report distinguishes repaired legacy defects from unresolved output defects.

Passing renders retain hashes and small thumbnails. Full-size screenshots are kept only for failures. `report` writes a JSON/Markdown audit plus an HTML contact sheet of up to 300 passing home-page thumbnails for human review.

Use these while an unattended run is active:

```powershell
.\scripts\run-legacy-rehab.ps1 -Command status -Json
$latestCompilerLog = Get-ChildItem "$env:LOCALAPPDATA\DailyClarity\template-rehab\logs\*.ndjson" |
  Sort-Object LastWriteTimeUtc |
  Select-Object -Last 1
Get-Content -LiteralPath $latestCompilerLog.FullName -Wait
```

Do not launch a second compiler against the same ledger. The scheduled task is configured to ignore a new instance, and the compiler itself rejects a second writer even if it is started outside Task Scheduler.

## Promotion, publication, and rollback

`promote --dry-run` is a staging validator, not a deployment command. It refuses to proceed unless all 5,486 source templates have terminal passing mappings and receipts, materializes a content-addressed staging mirror, and invokes the existing uploader in dry-run mode. The required result is zero quarantined candidates. No production manifest or blob is changed.

The later, separately authorized launch sequence is:

1. Review the 300-template contact sheet and audit report.
2. Upload to staging and re-run the customer preview/edit/deploy path.
3. Canary one small batch per niche.
4. Upload immutable assets first.
5. Switch the catalogue manifest last.
6. Retain the prior manifest and its immutable asset references.

Rollback is a manifest operation: restore the immediately previous manifest. Because assets and candidate trees are content-addressed and immutable, reverting the manifest restores the prior catalogue without rewriting source templates or deleting the rehabilitation evidence. Never delete the prior manifest until the canaries and post-switch smoke tests have passed.

## Capacity and recovery expectations

Defaults are eight static workers and four Chromium workers; rendering adapts between two and six workers according to available memory, retries transient browser failures three times, and recycles Chromium after 1,000 pages. Expected working storage is under 5 GiB.

The measured raw two-viewport render pass is about three hours. Plan for 6–12 hours for a deterministic end-to-end run and 12–48 hours for a first pass that includes unusual repairs or optional capped batch escalation. These are estimates, not timeouts: progress is durable in SQLite and `run --resume` is the recovery mechanism after interruption.

If a run stops:

1. Run `status` and inspect the newest runner/compiler log.
2. Correct environmental failures such as missing Chromium or insufficient disk space.
3. Re-run the same runner command with the same source, work root, and rule version.
4. Do not clear the database or artifact tree. Expired leases and completed hashes allow precise resumption.

If source content changes, treat it as a new catalogue input: stop the old run, inventory again under a deliberately incremented rule version (or a separate work root), and repeat the pilot. Do not mix changed source files into an existing receipt lineage.
