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

The legacy source root is read-only by contract. The compiler refuses overlapping source and work roots, hashes every source file, rechecks a template's tree hash after repair, re-inventories the complete catalogue before declaring a run successful, and writes all state beneath the work root. Both Windows wrappers resolve the nearest existing ancestor through junctions/reparse points before creating even the work root or runner log, and pass those canonical roots onward to the compiler. Do not point `-WorkRoot` at the catalogue, repository, a parent of either, or a cloud-synced source copy.

Recommended Windows paths:

```text
source: C:\Users\chris\platform-builder\platform-builder
work:   C:\Users\chris\Documents\DailyClarity\template-rehab
```

The older `%LOCALAPPDATA%\DailyClarity\template-rehab` ledger is preserved audit history and is not an input to this rule version. The CLI, runner, installer, commands below, and scheduled task all default to the fresh Documents root so an omitted argument cannot silently resume that superseded state.

## Architecture

The work root is the durable boundary for the run:

```text
template-rehab/
├── ledger.sqlite                 SQLite job ledger (WAL mode)
├── artifacts/
│   ├── candidates/               immutable, content-addressed template outputs
│   ├── receipts/                 browser-backed quality receipts
│   ├── promotion/                staging-only catalogue mirrors
│   └── .staging/                 transient atomic-write trees, reaped on restart
├── blobs/sha256/                 de-duplicated emitted file content
├── renders/
│   ├── thumbnails/               compact passing evidence
│   ├── comparison-screenshots/   transient lossless visual-dedupe evidence
│   └── failures/                 full screenshots retained for failures
├── reports/                      inventory, pilot gate, catalogue v3, audit, contact sheet
├── logs/                         structured compiler events
└── runner-logs/                  PowerShell runner output
```

The ledger tracks runs, templates, pages, issues, transformations, renders, dedupe clusters, aliases, artifacts, reusable cloud recipes, and model usage. Jobs carry a source hash, rule version, attempts, stage, lease owner/expiry, and terminal disposition. SQLite runs in WAL mode with `synchronous=FULL`; multi-row state changes use immediate transactions. Durable file writes use a same-directory temporary file, file sync, atomic replacement, and a containing-directory sync where the host supports it. Leases make an interrupted `run --resume` safe to continue. A work-root lock also enforces one compiler writer at a time. Its current format binds the PID to process start time, executable, and command identity, is published without exposing a partially written lock, refuses an unverifiable live owner, and can distinguish a stale lock from a recycled PID. Recovery reaps only the dedicated transient `.staging` directory; content-addressed candidates and promotion caches are never reaped.

The pipeline proceeds in this order:

1. Inventory and hash the immutable source.
2. Repair deterministically with `parse5`, PostCSS, the known foundations, page-role adapters, claim/form/script safety rules, canonical manifests, and local asset vendoring. DOM-boundary checks cover ordinary HTML, declarative shadow DOM, embedded/external SVG references, generated CSS content, and custom-property dependency closure. Every surviving form is rebuilt to the exact standard inquiry schema, template-authored active code is removed, and exactly one audited compatibility runtime is installed on each page. Inline copy repair preserves element structure instead of replacing a mixed-content ancestor. When legacy generation duplicated one inner page across several filenames, each copy is rebuilt through its own semantic role adapter rather than preserving mislabeled content.
3. If a candidate still cannot pass static safety, first materialize the exact final pre-fallback candidate as a content-addressed `failed-primary-template` artifact and bind its source, rule, candidate receipt, origin, and verification errors into the ledger. Only then substitute a vetted niche-specific neutral template with the same page set. Evidence persistence is fail-closed: if the failed candidate cannot be stored and registered, no fallback can become current. The immutable source, failed candidate, and reason all remain in the audit lineage.
4. Render every emitted page at 1440×900 and 390×844 in isolated Chromium contexts through the application-owned preview composition functions. External requests are blocked. The gate checks page and console errors, failed requests and same-origin HTTP responses of 400 or above, links/assets, visible structure, overflow, forms, accessibility, sentinel hydration, physical ID-targeted editing, and computed theme changes. A form passes only when the form, four canonical controls, four visible labels, and sole submitter are computed-visible and reachable, the controls are enabled/editable, and an actual submit event succeeds.
5. Separate canonical design, content preset, and theme preset. A foundation marker identifies one of 60 trusted lineage families, but it is not by itself proof of design equivalence. Foundation variants alias only when their post-repair design/composition hash and editable slot contracts match exactly. Incompatible variants remain distinct designs. Irregular variants alias only when page roles and niche match and every corresponding page passes DOM similarity plus desktop and mobile SSIM/perceptual-hash thresholds. SSIM is calculated over the native, losslessly decoded pixels of each full-page PNG at both viewports; dimensions must match, and lossy thumbnails are never similarity evidence. A homepage-only resemblance can never alias a multi-page site.
6. Emit one cryptographically scoped quality receipt and one catalogue mapping for every source slug.

Passing aliases do not erase content. Each legacy slug retains its own content/theme preset and lineage while the public gallery displays one representative for each canonical `designId`. This fail-closed policy can legitimately produce more than 60 public designs from the 60 foundation families; preserving every editable text and image slot takes precedence over an artificially small gallery count.

The rule-version 1.0.4+ foundation census repaired all 4,937 foundation-marked sources and formed 1,202 safe canonical clusters plus 3,735 compatible aliases. All 4,937 passed self/canonical composition checks. It rebuilt 13,159 role-adapted pages and reduced the 8,224 raw byte-redundant inner pages to zero duplicate-role outputs. These counts are verification evidence for this source snapshot, not hard-coded targets for a future changed catalogue.

The safeguards described below are implemented for rule version **`legacy-rehab-1.0.35`**. Preserved older pilots remain failed historical evidence rather than launch authorization: 1.0.21 exposed a customer-editor click-arbitration defect; 1.0.22 exposed repair/contract alignment gaps during its all-catalogue observer; 1.0.23 exposed textual SVG re-attestation and off-screen skip-link editability defects; 1.0.24 exposed zero-image compiler-page misclassification, structural landmark-label targeting, and decorative pointer overlays; 1.0.25 exposed content-heavy inline-flex rows collapsing into unreadable one-character columns on mobile; 1.0.26 exposed orphaned responsive navigation, presentation images that intercepted edits, and false audit failures caused by authored smooth scrolling; 1.0.27 exposed fixed-track mobile grids, nested-summary and formatting-whitespace verifier false negatives, mixed deterministic/browser findings that skipped deterministic remediation, and compiler-v3 preview/deployment injecting an unrelated global stylesheet into pages that did not author it; 1.0.28 exposed punctuation-only layout separators being advertised as tiny customer-editable targets on mobile; 1.0.29 exposed content flex rows whose fixed-width siblings collapsed editable copy, anonymous inline fixed-track grids without breakpoints, and fixed utility panels covering unrelated footer edit targets; and 1.0.30 exposed horizontal child sizing being applied to explicitly vertical flex cards, which made their CTA slots physically unreachable on mobile. The fresh 1.0.33 pilot passed on 2026-09-25 as recorded below. Full catalogue certification remains incomplete until every source slug passes its final gates.

The 2026-09-25 recovery resumed the orphaned 1.0.31 pilot against the unchanged source catalogue hash `c4f5f6b9dce67820de41d5b907e0973fb9db7873f3b2edfe3aa65f9af0c0dcfe`. Its ledger passed `PRAGMA quick_check`; 67 templates reached browser verification before a reproducible synchronous repair loop required interrupting that compiler process. That count includes neutral fallbacks and is **not** passing catalogue evidence. The report, contact sheet, inventory, and fixed 100-template source/artifact regression manifest are preserved beneath `reports/history/2026-09-25-legacy-rehab-1.0.31/`; all previous candidate trees and render rows remain in the ledger.

Rule 1.0.32 addresses the grouped causes from that recovery: identity defaults cannot match inside an existing personalization binding (the literal `State` previously expanded `{{STATE}}` forever inside SVG text); mobile planner, roadmap, lead-magnet, and footer content rows keep usable child widths; base scroll-reveal and legacy accordion content is visible after its source scripts are removed; empty decorative pseudo overlays allow pointer events through without changing their pixels; and browser QA waits for a restored intrinsic-size image to decode before selecting the next physical click coordinate. Native disclosure controls, intentionally hidden dialogs, compact navigation/action rows, and explicit pseudo-element interaction rules retain their existing semantics. A child-process deadline guards the synchronous-loop regression. Each rule still requires the unchanged desktop/mobile, accessibility, customer-editing, source-hash, and zero-fallback acceptance gates.

The fixed 12-template regression subset from the preserved failed primary candidates passed all targeted desktop/mobile page matrices under 1.0.32, including normal deterministic contrast retries and no neutral replacements. Its report is retained in `reports/history/2026-09-25-legacy-rehab-1.0.32/fixed-regression-report.json`. Package validation passed 314 tests with one pre-existing skip and no failures; the subsequent stripped-pattern pseudo-overlay regression also passed, and TypeScript checking passed. These bounded checks authorize a fresh 100-template pilot, not catalogue certification.

The diagnostic 1.0.32 pilot finished in approximately 11 minutes on 2026-09-25 with 100 browser-verified templates, 1,298 current passing page/viewport renders, and 2,502 render attempts including remediation. The gate correctly failed because `wellness_coach-MORE-2026-02-17T04-10-03-845Z-029` required one neutral replacement after its mobile `.rotor` content collapsed. Its failed primary candidate, passing neutral artifact, receipt, report, contact sheet, catalogue, and failed pilot gate are preserved; the reports are archived under `reports/history/2026-09-25-legacy-rehab-1.0.32/`. These results do not authorize full processing.

Rule 1.0.33 extends the same content-flex repair to `.rotor` while preserving compact controls. It also restricts script-dependent content restoration to flat, exact base selectors and direct declarations, preserving nested and ancestor-controlled hidden states. Review found an unsupported case-study family that the older semantic gate missed: measured outcomes, anonymized examples, quantified focus/adherence claims, and promised progress within a fixed timeframe. The shared contract now rejects those claims independently. Repair rewrites the scoped example copy, captions, and attribution in place, retaining the gallery, figures, images, inline controls, and corresponding style/fragment references. Operational durations, frequencies, goals, questions, and adjacent benign copy remain covered by negative regressions. The frozen 1.0.33 compiler requires a new 100-template zero-fallback pilot before full certification.

Before that fresh pilot, all 13 templates in the expanded fixed regression set passed their targeted desktop/mobile browser matrices without neutral replacements; the 1.0.33 report is preserved under `reports/history/2026-09-25-legacy-rehab-1.0.33/fixed-regression-report.json`. The complete package suite passed 319 tests with one pre-existing skip and no failures, and TypeScript checking passed. These checks are bounded regression evidence, separate from the pilot and complete catalogue gates.

The fresh 1.0.33 pilot `633c4cd0-e3cc-4d8d-bdfb-b3a359779e93` passed at 2026-09-25 08:14 UTC: all 100 primary designs passed, with zero neutral replacements, zero deterministic failures, and zero final evidence issues. Its 648 source pages emitted 649 pages (including the required missing-home repair), with 1,298 current passing desktop/mobile render records and 2,488 total attempts including remediation. All selection, coverage, source lineage, current receipt, and preservation gates passed. The gate, pilot catalogue, report, contact sheet, and immutable source hash are archived in the 1.0.33 history directory. `compiler-checkpoint.json` records commit `591f270cb48a133ca9bd1631344affbb7ca20e46` and hashes of all 11 app customer-composer dependencies; both were checked unchanged before starting full certification.

Full run `0798d2b8-9eda-4594-b52b-1a6d4c638747` started at 2026-09-25 08:16 UTC through the hidden, one-off durable PowerShell wrapper, with three bounded resume attempts and no cloud option. Its launch record is `reports/history/2026-09-25-legacy-rehab-1.0.33/full-run-launch.json`; compiler progress is in `logs/0798d2b8-9eda-4594-b52b-1a6d4c638747.ndjson`, and the wrapper log is `runner-logs/20260925-041558-run.log`. The complete static census finished at 08:29 UTC with 5,385 additional primary designs and one neutral fallback, alongside the prior 100 passing pilot designs. The zero-fallback gate rejected the run before any new full-run browser rows were created. The compiler exited and the wrapper was stopped before retry; no rule 1.0.33 writer remains active. The complete census, failed-primary evidence, report, and contact sheet are preserved under `reports/history/2026-09-25-legacy-rehab-1.0.33/full-static-failure/`. This is failed diagnostic evidence, not completed certification or promotion. At launch the work root used 1.64 GiB and the disk had 1,671 GiB free. The wrapper reported no sleep-prevention warning; independent OS power-request inspection required elevation and was unavailable.

Rule 1.0.34 addresses the sole new full-census failure, `private_practice_therapist-MORE-2026-02-17T06-35-17-503Z-014`. Its original `html{visibility:hidden}` rule left the complete document hidden and suppressed every home-page edit ID. Repair changes only direct `visibility:hidden/collapse` declarations in unconditional top-level rules whose selectors are entirely bare `html` or `:root`; it preserves all other declarations, importance, content, and layout. Body, qualified/state, mixed, descendant, nested, media, supports, container, and keyframe rules remain unchanged. The same source exposed an offscreen accessibility link using class `skip`; the existing skip-link control classification now also recognizes that exact class with a canonical skip-to-content label and local fragment. It preserves the link and CSS without advertising accessibility-control text as customer copy. The PowerShell runner also uses a SHA-256 file stream for its pilot-gate diagnostic, avoiding an unavailable `Get-FileHash` command in the hidden Windows PowerShell host.

All 14 templates in the expanded rule 1.0.34 real regression set passed their targeted desktop/mobile matrices without neutral replacement, including all eight pages of the newly exposed therapist source. The report and runner are archived under `reports/history/2026-09-25-legacy-rehab-1.0.34/`, alongside the initial skip-control diagnostic and the successful hidden-host wrapper preflight regression. The final package suite passed 325 tests with one pre-existing skip and zero failures, including the document-visibility and skip-control regressions. TypeScript and lint passed.

The fresh 1.0.34 pilot `51665ce6-012d-4c67-95d6-03afa109a2e9` passed at 2026-09-25 08:56:46 UTC after 11 minutes 8.6 seconds: all 100 primary designs, zero neutral replacements, zero final evidence issues, and all pilot gates passed. There are 1,298 current passing desktop/mobile records; 2,488 total attempts include deterministic remediation. The compiler is frozen at `0ba459316d7bb356cdba6dc7bd53e4af1f0c993c`, and all 11 customer-composer dependencies match its checkpoint. The passing gate, report, contact sheet, and source hash are preserved in the 1.0.34 history directory.

Full run `ad00edbd-d12b-40e6-958e-fc51a750185e` started at 2026-09-25 08:58:52 UTC through a hidden one-off wrapper with three bounded resume attempts and no cloud option. Its runner log is `runner-logs/20260925-045850-run.log`; its compiler log is `logs/ad00edbd-d12b-40e6-958e-fc51a750185e.ndjson`. The wrapper verified the 47,863-byte pilot gate SHA-256 `97575dff06fa692280b9bcb48f9976a619ec182ec9de6b42864fab74d68cc133` before processing. This records the full run's launch, not completed certification or publication. Its current state and safe recovery instructions are in the external rule-34 history handoff. No recurring automation or notification was created.

Rule 1.0.35 repairs original layouts that previously reached browser neutral fallback: local SVG reference and intrinsic-size defects, decorative pointer and overflow layers, static reveal and accordion content, malformed landmarks and ARIA tables, and responsive content geometry. The strict physical editor, accessibility, source-preservation and zero-fallback gates remain in force. The prior rule-34 full run completed its browser census but failed preservation with 212 neutral replacements; its ledger and diagnostic evidence are archived intact. The third diagnostic pass on those 212 originals passed 143 and left 69 failures; further bounded fixes and their preservation regressions are implemented, with a fresh complete regression, new pilot and full certification still required before launch. These implementation and diagnostic results do not certify the full catalogue.

Before restarting, an in-memory deterministic census recompiled all 5,486 immutable source templates. Under 1.0.22 semantics it reproduced exactly nine publication-contract failures with no exceptions, including three variants that the interrupted full run had not reached. An early 1.0.23 census reached zero failures under the checks that existed at that moment, after which adversarial review deliberately expanded the contract for generated CSS content, embedded SVG, exact form semantics and visibility, stale foundation identity, and physical edit-target reachability. After those rules settled, a fresh five-niche census processed aromatherapy 1,292/1,292, holistic medicine 1,002/1,002, private-practice therapist 1,087/1,087, sound bath 1,001/1,001, and wellness coach 1,104/1,104: all 5,486 completed with zero publication-contract failures and zero exceptions. This is deterministic static evidence—not a substitute for the required fresh pilot, two-viewport browser matrix, final receipts, or dry-run promotion gate.

## Commands

Run commands from the repository root. Always pass an explicit source and work root when invoking the CLI directly:

```powershell
$source = 'C:\Users\chris\platform-builder\platform-builder'
$work = 'C:\Users\chris\Documents\DailyClarity\template-rehab'

pnpm templates:legacy inventory --source $source --work-root $work
pnpm templates:legacy pilot --resume --source $source --work-root $work --pilot-size 100
pnpm templates:legacy run --resume --source $source --work-root $work
pnpm templates:legacy status --source $source --work-root $work
pnpm templates:legacy report --source $source --work-root $work
pnpm templates:legacy promote --dry-run --source $source --work-root $work
```

The PowerShell runner supplies those paths on every invocation, validates the exact pnpm version pinned by the repository, prevents automatic system sleep while work is active, writes an operator log, and retries a failed full run three times by default. A retry always includes `--resume`. It prefers `pnpm` on `PATH` and otherwise runs the pinned version through Corepack.

```powershell
.\scripts\run-legacy-rehab.ps1 -Command inventory
.\scripts\run-legacy-rehab.ps1 -Command pilot
.\scripts\run-legacy-rehab.ps1 -Command run
.\scripts\run-legacy-rehab.ps1 -Command status -Json
.\scripts\run-legacy-rehab.ps1 -Command report
.\scripts\run-legacy-rehab.ps1 -Command promote
.\scripts\run-legacy-rehab.ps1 -Command status -Preflight -UsePersistedPath
```

The last command is a non-mutating scheduler preflight. It reconstructs the persisted User + Machine `PATH`, validates pnpm, loads the compiler CLI, and confirms the configured Playwright Chromium binary exists without creating or changing rehabilitation work-root files.

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

Preview mode does not register anything. The installer first runs the non-mutating preflight against the persisted Windows environment and refuses registration if the scheduled action could not resolve the pinned package manager, compiler CLI, or Chromium. To register it deliberately:

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

Every editable text node has a deterministic `data-dc-edit-id`; every image and meaningful CSS background has a deterministic `data-dc-image-id`. Visible-text IDs are leaf-only: an edit target cannot own child links, controls, icons, or other element structure. If a mixed-content element contains meaningful direct text, the compiler wraps just that text in a `<span data-dc-edit-wrapper="direct-text">` leaf and annotates the wrapper and existing descendants independently. Attribute slots such as image alt text remain separate. This prevents a customer text replacement from erasing adjacent structure.

The editor's **Page & SEO** controls expose exactly the page's single leaf `<title>` slot and single `<meta name="description" content="…">` slot when they carry valid compiler IDs. Other head metadata, including viewport configuration, is never offered as editable copy. Title and description changes use the same ID-first inline-edit record as body copy and therefore follow preview, checkout revision pinning, portal persistence, deployment generation, and subsequent editing. Existing catalogue-v2 drafts remain compatible through original-string/source fallback fields.

New v3 checkout receipts also pin the exact SHA-256 hashes of `_catalog-v3.json` and `_manifest.json`. The server resolves that pair only inside its configured template store, re-hashes both objects, validates its v3/count/lineage contract, and reads pages and assets beneath `catalogs/<catalog-hash>/`; a browser cannot select a different store. The active rehabilitation catalogue must contain the current inventory's exact 5,486 slugs. A hash-addressed historical snapshot is instead validated against its own declared `sourceTemplates`, manifest, mappings, and canonical-design uniqueness, so a legitimate earlier catalogue is not rejected merely because the active inventory later changes. Portal metadata, preview HTML, asset URLs, persistence, and deployment generation all use the saved pin, so activating a newer catalogue does not invalidate an existing customer's edit IDs. Pins written before hash coordinates existed remain backward compatible against the current catalogue only. Empty, malformed, mismatched, or unavailable historical snapshots fail closed with a revision error instead of silently applying edits to a different design.

Customer preview has one shared composition route and one shared editor runtime. The template gallery/editor and **Preview Your Business** both call the app's pure `composeCustomerPreviewDocument` helper and install the script returned by `getCustomerPreviewEditorScript`. Compiler browser QA imports those same app modules directly and fails closed if either implementation cannot be loaded. The ordered route sanitizes template HTML, rewrites manifest-backed asset URLs, sanitizes and layers CSS, applies persisted text/image edits, and only then appends the app-owned editor code exactly once. Chromium then drives that exact runtime through text, attribute, standalone-image, responsive-picture, and navigation message round trips; source-code similarity or a compiler-owned imitation is not accepted as browser evidence. Click arbitration keeps ancestor background slots from swallowing nested link or control activation: the background remains editable from its direct surface, while a raster `<img>` inside a link remains an image-edit action. The whole-catalogue promotion verifier separately exercises every advertised slot through the persistence and deployment contracts; that evidence complements rather than substitutes for browser QA of the exact customer route.

Supported stylesheet and inline backgrounds become editable only when their selectors resolve to one real, meaningful page element. Decorative, pseudo/dynamic, unsupported, ambiguous multi-target, conflicting, or unmatched backgrounds remain visually intact but are deliberately not advertised as customer controls; each suppression has a receipt reason. Customer-visible CSS-generated copy is materialized as ordinary DOM text before ID assignment, and its source `content` declaration is removed or canonicalized so the browser cannot display uneditable duplicate copy. Responsive `<img>` and `<source>` elements use one slot per actual picture element and preserve their original `src`/`srcset` composition until a customer replaces the picture. Video/audio sources, decorative images, hidden/inert elements, pointerless surfaces, action-owning backgrounds, and incomplete picture groups are not advertised. An `<img>` whose legacy markup omits `src` is repaired to a deterministic local placeholder rather than left as a broken request, and remains customer-editable through its stable slot. One replacement is then recorded atomically as independent stable-ID swaps for every direct `<source>`/`<img>` sibling in that `<picture>`; preview and deployment both apply the complete group, while a missing, duplicate, or structurally ambiguous group fails closed.

“Complete” therefore means more than rendering: each slug must resolve to a passing canonical design or passing alias, and its IDs must survive composition and persistence. Browser QA performs ID-targeted text and theme mutation checks through the shared preview composer and requires image slots to remain unique, local, and renderable. The promotion gate then batches a sentinel edit into every advertised text/image slot of every staged page and proves the same payload through checkout revision pinning, portal persistence, deployment generation, and theme mapping. A neutral fallback is also fully ID-editable; it exists to preserve coverage without publishing unsafe or broken legacy content.

Forms and active behavior are deliberately narrow. A page may contain only the standard `contact` POST form with audited Netlify submission, no custom action, and exactly one required name input, one required email input, one optional telephone input, and one required message textarea. Selects, extra or sensitive fields, `form=` associations, orphan controls, noncanonical nested-label topology, and template-authored form `aria-*`, `title`, or `role` semantics fail the strict v3 contract. The independent v2 compatibility scanner still resolves the complete final-DOM ID-reference graph so dangling, duplicate, or ambiguous accessible relationships cannot bypass safety. Repair installs neutral canonical labels rather than preserving removed sensitive/proof language. Final-DOM accessibility normalization removes names prohibited on generic, presentational, or roleless `<div>` containers and clears stale edit-slot metadata for suppressed attributes. A roleless named container whose usable controls survive is instead promoted to a valid named `group`; valid names on supported landmarks and controls are preserved. All source scripts, event handlers, frames, objects, embeds, and meta refreshes are removed. The sole template runtime is the fixed local `assets/js/dc-compat.js` `compatibility-v1` script, exactly once per page; browser QA exercises both its navigation behavior and standardized form event.

Embedded URLs are contextual rather than globally trusted. Candidate HTML rejects JavaScript, VBScript, and every blob URL across HTML, emitted SVG, declarative shadow DOM, and semantic SVG reference attributes such as `href`/`xlink:href`. A non-empty, valid base64 raster data URL is allowed only as an image `src` or video `poster`; candidate `srcset` remains local-only. CSS may use the same raster payload in `url()`, but never in `@import`; active schemes and blob URLs are rejected after control-character and CSS-escape normalization, including values reached through custom-property substitution. Unresolved or cyclic security-relevant variables fail closed. Customer preview applies the same template boundary, while a transient blob image is accepted only through the trusted post-sanitization customer image-swap path. Remote approved assets are downloaded and rewritten to local references before a candidate can pass.

## Model and token policy

Inventory, parsing, repair rules, asset rewriting, rendering, accessibility checks, hashing, and deduplication use zero OpenAI tokens. The normal pipeline is deterministic and needs no API key. It can retain neutral fallback artifacts for diagnosis, but those artifacts cannot satisfy the pilot, full-certification, or promotion preservation gates.

The isolated cloud-repair module is reserved for unresolved DOM fragments only. The normal CLI commands do not call an external model automatically. An operator must explicitly pass `--cloud-repair` to the TypeScript CLI (or `-CloudRepair` to the PowerShell runner) on a `pilot` or `run` invocation and provide `OPENAI_API_KEY` in that process environment. The flag is deliberately absent from the scheduled-task installer, and the credential is never written to command arguments, task definitions, compiler state, or logs. Opting in is not permission to send whole templates. The module enforces:

- model `gpt-5.6-terra` through Responses batch requests;
- structured JSON patch operations against supplied node IDs;
- one durable, checksummed recipe per repair-rule version, niche, page role, and matching issue fingerprint; concurrent workers coalesce behind one billable owner and revalidate every target before reuse;
- no more than two attempts per fragment;
- no more than 1,000,000 total tokens and no more than $25 accounted spend;
- deterministic neutral fallback when either ceiling would be crossed.

Usage reservations and actual provider usage are reconciled idempotently in the ledger. Missing provider telemetry keeps the conservative reservation accounted. If reconciled actual usage crosses either hard ceiling, the telemetry is still recorded truthfully, the cloud output and reusable recipe are rejected, the authorization counter saturates with zero remaining headroom, further reservations are refused, and that fragment takes the deterministic neutral fallback. An underestimated response can therefore never reopen budget or become publishable. Do not add an API key to the scheduled-task command or logs. Cloud escalation must remain an explicit operator decision; a deterministic run needs none.

## Gates and evidence

The 100-template stratified pilot covers foundations, topologies, issue families, and generation cohorts. Full processing is blocked unless the current rule version has a passing pilot with no critical defects, less than 2% deterministic failure, and every selected template passing the stricter current gate.

For each page and viewport, the final gate requires no unresolved tokens, sample contacts, unsupported claims/proof, nonstandard form controls, unsafe embedded URLs, missing local assets, broken internal links, exceptions, failed requests, same-origin HTTP status of 400 or above, blank content, overflow above one pixel, duplicate DOM IDs or edit IDs, unsafe CSS/SVG/declarative-shadow-DOM content, or critical/serious Axe findings. Navigation, standardized forms, sentinel profile hydration, physical reachability and mutation of every advertised text/image ID, persistence/deployment replay, and theme-variable mutation are tested through the exact shared customer-preview composition path.

Inventory findings describe the immutable source and remain available in transformation history. They are marked resolved only after the repaired candidate earns a complete browser-backed receipt, so the final report distinguishes repaired legacy defects from unresolved output defects.

Candidate assets, presets, and render evidence are cryptographically attested, not trusted by path alone. Every vended asset has a SHA-256 content-addressed filename plus final byte count, content type, origin, and license metadata; cache reuse requires the index key to equal the requested source URL, an approved final URL, and the exact license policy for that provider. Redirects cannot cross provider/license boundaries. Rewritten stylesheet bytes are re-addressed, while modified binary bytes are rejected. A resumed theme preset must match its slug, identity, schema, and content hash; each token is parsed as one safe CSS declaration with bounded color/font syntax, and font imports are restricted to the exact approved Google Fonts hosts before interpolation. Each candidate also carries a sorted artifact-tree manifest that binds every relative path to its SHA-256 and byte count, and the materialized tree is re-read before reuse or promotion.

Passing renders retain screenshot/perceptual hashes and compact WebP thumbnails. Each retained thumbnail is bound to its render row and final receipt by SHA-256 and byte count, must resolve beneath the real render root without a symbolic-link escape, and must decode to non-empty pixels when the pilot, final audit, or contact sheet consumes it. Ledger schema v6 preserves older render rows as history but rejects their aliases, clears their terminal receipt/disposition, and returns formerly complete templates to `render_pending`. Schema v7 separates immutable run/template artifact occurrences from deduplicated physical content-addressed trees, so observing the same bytes again cannot overwrite earlier forensic lineage. Failed-primary occurrence metadata version 2 records the immutable niche, legacy slug, relative path, content hash, and byte count at observation time; reports validate that identity rather than trusting a source directory that may later move, while older metadata is backfilled only from immutable ledger rows. Candidate and failed-primary writes reject reparse-point escapes before staging, before rename, and after publication. A current final receipt is version 2 and declares the `customer-preview-v1` render protocol, so evidence captured before the application-owned preview composition route cannot authorize promotion. Temporary lossless comparison PNGs exist only for visual dedupe and are removed afterward; full screenshots otherwise remain only for failures. `report` holds the compiler writer lock while it combines ledger and filesystem evidence, then writes a JSON/Markdown audit plus an HTML contact sheet of up to 300 passing home-page thumbnails for human review.

The final page-matrix audit also proves exact source lineage. For each template, emitted HTML, the emitted manifest, static-passed ledger rows, two-viewport render rows, and the signed receipt must cover exactly the source inventory's HTML paths, with one generated `index.html` added only for the single source template that lacks it. For the current immutable source snapshot that is 33,962 source pages and exactly 33,963 emitted pages. Missing or extra pages force deterministic repair instead of permitting a self-consistent but incomplete candidate. A missing/corrupt candidate, manifest, or ledger page discovered before rendering is isolated to that template, recorded as a current issue, and atomically returned to `repair_pending`; healthy siblings continue, and corruption alone can never manufacture a neutral-fallback receipt.

Use these while an unattended run is active:

```powershell
.\scripts\run-legacy-rehab.ps1 -Command status -Json
$latestCompilerLog = Get-ChildItem 'C:\Users\chris\Documents\DailyClarity\template-rehab\logs\*.ndjson' |
  Sort-Object LastWriteTimeUtc |
  Select-Object -Last 1
Get-Content -LiteralPath $latestCompilerLog.FullName -Wait
```

Do not launch a second compiler against the same ledger. The scheduled task is configured to ignore a new instance, and the compiler itself rejects a second writer even if it is started outside Task Scheduler.

## Promotion, publication, and rollback

`promote --dry-run` is a staging validator, not a deployment command. It refuses to proceed unless all 5,486 source templates have terminal passing mappings and receipts, materializes a content-addressed staging mirror, invokes the uploader in dry-run mode, and runs the whole-catalogue customer-customization verifier. The required result is zero quarantined candidates and zero customization diagnostics. No production manifest or blob is changed.

The uploader has a separate, explicit `--rehab-v3-staging` publication profile for the later authorized staging step. It requires the complete explicit promotion root, rejects `--only` and `--force`, and refuses any real write unless `CONTEXT` identifies a non-production deploy. Rehabilitation objects live only in the `templates-rehab-staging` Blob store beneath `catalogs/<catalog-sha256>/`. Every object is read back and its actual bytes are re-hashed; `_catalog-v3.json` and `_manifest.json` are likewise verified before `_active.json` is switched as the final write. The runtime selects that store only from the server-side `DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE=rehab-staging` setting; it rejects that profile in production and never falls back to the launch filesystem, `templates` store, or public HTTP path.

The later, separately authorized launch sequence is:

1. Review the 300-template contact sheet and audit report.
2. Upload to staging and re-run the customer preview/edit/deploy path.
3. Canary one small batch per niche.
4. Upload immutable assets first.
5. Switch the catalogue manifest last.
6. Retain the prior manifest and its immutable asset references.

Rollback is a manifest operation: restore the immediately previous manifest. Because assets and candidate trees are content-addressed and immutable, reverting the manifest restores the prior catalogue without rewriting source templates or deleting the rehabilitation evidence. Never delete the prior manifest until the canaries and post-switch smoke tests have passed.

## Capacity and recovery expectations

Defaults are eight static workers and four Chromium workers; rendering adapts between two and six workers according to available memory, retries transient browser failures three times, and recycles Chromium after 1,000 pages. At the 2026-09-25 08:52 UTC checkpoint, the work root occupied 7.1 GiB across 356,323 files, including preserved full-census artifacts and history; the disk had approximately 1,669 GiB free. Historical artifacts and full-run render evidence can increase that footprint, so inspect actual disk space before resuming instead of relying on a fixed size estimate.

During the 2026-09-25 recovery, 64 additional templates reached browser verification in 7 minutes 13 seconds before the reproducible repair loop interrupted progress. This is partial recovery throughput, not a completed catalogue benchmark. Future fresh pilots and the full run provisionally require about 15–45 minutes and 12–36 hours respectively on this machine; additional defect families or retries can extend either. Full matrices, composition/deduplication, final receipt audits, and customization checks remain required, so raw render throughput alone cannot predict completion. Progress is durable in SQLite and `run --resume` is the recovery mechanism after interruption.

If a run stops:

1. Run `status` and inspect the newest runner/compiler log.
2. Correct environmental failures such as missing Chromium or insufficient disk space.
3. Re-run the same runner command with the same source, work root, and rule version.
4. Do not clear the database or artifact tree. Expired leases and completed hashes allow precise resumption.

If source content changes, treat it as a new catalogue input: stop the old run, inventory again under a deliberately incremented rule version (or a separate work root), and repeat the pilot. Do not mix changed source files into an existing receipt lineage.
