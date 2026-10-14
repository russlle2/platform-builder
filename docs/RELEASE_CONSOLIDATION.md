# Consolidated DailyClarity release

Release base: `codex/legacy-catalog-rehab-20260903` at `c7e116c4`, which contains launch-hardening commit `74b5fade` from PR #18. The separately modified original checkout is not part of these edits. Production remains gated on full catalogue certification and connected staging evidence. Booking Kit sales remain disabled.

## Overlapping pull requests

| PR | Useful behavior carried forward | Reviewed differences |
| --- | --- | --- |
| #18 | Full launch hardening, durable fulfillment, runtime identity checks and catalogue compiler | Its head is an ancestor of this release. |
| #16 | Seeded template selection, brand matching, JSON-LD, SEO and Supabase RLS | JSON-LD component and metadata backfill script retained; migrations are replay-safe and public claims are more conservative. Malformed pagination is fixed in this release. |
| #15 | Wellness positioning, lead validation, navigation and product demo | The demo uses the real video player; unsupported discount language is omitted. |
| #14 | Niche examples, timed template matching with Retry, font loading, touch editing and persistent customizations | The current shared preview pipeline preserves original image URLs, as asserted by its integration test. The old automatic image-proxy rewrite is intentionally omitted. Immutable caching is limited to revision-pinned assets, so unversioned edits cannot become stale for a year. Unused legacy components retain internal HVAC names; these are not active customer flows. |
| #12 | Checkout readiness and visible configuration failure behavior | Current hardened readiness replaces duplicate bindings and repeated UI text in that older diff. |

Except for #18, these are behavioral carry-forwards; the older PR heads are not claimed as merged ancestors. Supersede the older PRs only after the replacement diff has been reviewed and the consolidated PR exists.

## Release evidence boundaries

Application tests, UI fixtures, schema replay, catalogue certification, and connected provider tests are separate evidence. A fixture-backed private-result page does not prove a Stripe purchase or received email. A passing 100-template pilot does not certify all 5,486 templates. Neutral replacement designs do not preserve the originals.

The production promotion must identify the exact tested commit and immutable catalogue hash, preserve every original slug through verified canonical/alias mappings, and retain both the previous deployment and catalogue pointer. Do not replace this gate with the curated 60-template baseline. The baseline is only rollback material.

No paid cloud repair is part of this execution. Separately authorized cloud work retains both ceilings: $25 and 1,000,000 total tokens, with notification before either is exceeded.
