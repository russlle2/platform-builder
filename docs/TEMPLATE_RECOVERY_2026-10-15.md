# Template recovery and curated catalogue review — 2026-10-15

All 5,486 original template source directories were located on the owner's connected Windows laptop. The original catalogue has **not** completed current certification or publication. The separate, checked-in 60-template curated catalogue has been repaired and rebuilt; its reviewed artifact is identified below.

## Original catalogue recovered

Read-only directory counts match the expected source inventory exactly:

| Niche | Original templates |
| --- | ---: |
| Aromatherapy | 1,292 |
| Holistic medicine | 1,002 |
| Private practice therapist | 1,087 |
| Sound bath | 1,001 |
| Wellness coach | 1,104 |
| Total | 5,486 |

Source: `C:\Users\chris\platform-builder\platform-builder`. Work ledger and preserved artifacts: `C:\Users\chris\Documents\DailyClarity\template-rehab`. The preserved September 25 inventory records 33,962 source HTML pages, 58,287 files, 308,239,941 bytes, and source catalogue SHA-256 `c4f5f6b9dce67820de41d5b907e0973fb9db7873f3b2edfe3aa65f9af0c0dcfe`. Directory counts were verified again on October 15; the new pilot must recheck source contents and hashes.

The prior public inventory contained 5,485 entries. The missing entry is now proven to be `aromatherapy-2026-02-16T17-49-46-474Z-035`, whose source lacks a homepage. Removing that slug from the recovered 1,292 aromatherapy directory names yields the same sorted-name SHA-256 as the 1,291 prior public slugs: `9dcf89fb7b952d617fd1aa0605fec0ffee40d301a4ca387b3731e629486ebb5d`. The compiler's documented lineage repair adds its required `index.html`, making the expected emitted total 33,963 pages.

Read-only SQLite inspection found a genuinely passing rule `legacy-rehab-1.0.36` pilot from 2026-09-25: 100 primary designs, 649 emitted pages, 2,488 render attempts, zero final critical or serious defects, and zero neutral replacements. Its full run then stopped without completing: 100 complete, 1,089 awaiting rendering, 4,289 awaiting repair, and eight interrupted during repair. The recorded owner process no longer existed. Historical alias/render rows are not current certification evidence.

The clean compiler worktree used for that run is `C:\Users\chris\Documents\Codex\2026-09-03\legacy-catalog-rehab`, at `ee07a271`. The older `C:\Users\chris\platform-builder` checkout contains unrelated uncommitted/untracked work and must be preserved. Updated compiler/composer code requires a new rule identity and fresh pilot before full processing; artifact caches do not automatically invalidate on code changes. Full certification, promotion customization checks, and publication remain required for all original templates.

## Runtime and editing repairs

- Gallery HTML now applies the same stylesheet-selection policy as the customer preview. Compiler-v3 pages retain their own stylesheet structure; optional curated-v2 CSS is sanitized before injection.
- The asset route serves executable JavaScript only for the exact trusted `assets/js/dc-compat.js` bytes on contract-v3 templates. Arbitrary, modified, alternate-path, and v2 script assets remain non-executable attachments.
- Catalogue readiness now reports bounded raw, validated, and rejected counts, with causes distinguishing missing storage/snapshots/manifests, malformed or empty manifests, rejected entries, and contract mismatch. Existing validation and all-or-nothing integrity gates remain in force.
- Curated hero background images and decorative shapes no longer obstruct text editing. Clicking an unobstructed hero background selects its actual image, while text and controls retain their own interactions.

## Curated 60-template artifact

The original approved receipt and contract are preserved in `catalogue-history/2026-10-14/`. Source commit `0ce82f2633691a61c803a3dd6a4555f5e7016630` preserves the prior factory implementation. No original 5,486-template source was replaced by a curated design.

The original curated output referenced 22 unavailable image URL variants representing 13 photo IDs, affecting 26 templates and 87 pages. Review also found healthy URLs with unrelated subjects and incorrect source comments. Replacements use the existing documented Unsplash source pool: oil application, massage, meditation, exercise, bookshelves, flowers, and nature. Every retained photo subject was visually checked, and comments now describe the actual image. The exact 67 changed pool entries and all 15 final photo subjects are recorded in `catalogue-history/2026-10-15/curated-image-source-diff.json`.

Reviewed output: `/workspace/dailyclarity-curated-reviewed-20261015`, with 60 templates, 360 HTML pages, and 600 deployable files. Curated-report SHA-256: `2e764ba81fcea7f4c539069bd89a16a1429d4791b8443e48e100d9224c5b2a7d`. Template identity SHA-256: `401518abd2e98df88eb883a142eabf2c5e7eb85b21cbba8b598d0d4793642fe7`.

All 30 final image URL variants returned HTTP 200 and real image bytes. The full browser matrix uses those fetched bytes, the app's actual composition functions, and its editor runtime. It exercises every curated page at 1,440×900 and 390×844, physically edits and reapplies one heading, selects the first image, and changes the theme. This is finite coverage of 720 curated views; it does not claim every text/image slot was independently exercised, a checkout was completed, or the original catalogue was certified.

The final matrix result and approval transition are recorded in `catalogue-history/2026-10-15/curated-review.json`. Workspace evidence, including full per-view results, fetched-media manifests, the inspected photo contact sheet, source-set proof, and read-only laptop ledger summary, is under `/workspace/template-audit-20261015/`.
