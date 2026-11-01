# DailyClarity experience and differentiation audit

Observed 16 October 2026 on https://dailyclarity.org and repository `russlle2/platform-builder`, starting from `fafde2dcd12bd6a8a5481a27e6035a510904f75c`.

## Direction

DailyClarity's strongest opportunity is a carefully guided launch for a wellness practice: show an appropriate design, help the owner explain their services, preserve their work, and make the route to contacting them dependable. Template volume and generic claims about AI are weak reasons to choose a platform. Visible care at each of those steps is a more credible distinction.

This audit examined public acquisition pages, five practice categories, preview and template selection, pricing, contact, legal information, account entry points, mobile layouts, keyboard access, search metadata, and the existing release process. It did not inspect private customer records or send marketing messages. Browser tests use local fixtures for customer information and payment requests. Recommendations below are hypotheses; no conversion increase has been measured.

## Findings and implementation

| Detail | Observed problem | Change in this implementation |
| --- | --- | --- |
| First impression | A long hero and a decorative “Live pipeline” card describe the product without letting the visitor experience it. | Shorter headline/supporting copy and a practice selector that opens a real sample preview without contact information. |
| Product proof | Three large “Coming soon” blocks occupy the proof section. | Replace them with working preview, launch-checklist, and plan-comparison links; retain an honest early-access statement. |
| Differentiation | “Most website builders give you a blank canvas” is an outdated blanket comparison. | Explain the actual client questions the product helps a practice answer. |
| Template discovery | The live wellness page reports 1,022 templates but has no featured examples; the selector requires editorial flags missing from the catalogue. | The initial 13 starting points were narrowed after the 17 October review to one therapist and three wellness designs, when present in the active gallery. Curated niches have no unreviewed fallback in marketing or sample mode; unavailable samples have explicit recovery choices. Normal personalized catalogue discovery remains available. See [the follow-up](SHOWCASE_SELECTION_2026-10-17.md). |
| Visual evaluation | The existing showcase is text-only, and the unused screenshot gallery is not a reliable match to current designs. | Load the selected design on demand in a sandboxed preview; offer wide/mobile views, clear loading/retry states, and exact-template continuation. |
| Featured-design quality | Visual review found obscured-content defects, tall mobile navigation in some designs, and empty/default CTA labels. Passing the existing technical catalogue gates does not establish good visual quality. | Curate the marketing showcase from reviewed designs and fill missing sample labels with neutral example text. Record underlying catalogue repairs separately; certified template bytes are not silently edited. |
| Sample styling | Applying the quiz's default palette to the sample recolors reviewed designs and reduces contrast on some buttons and mobile menus. | Preserve original color, font, and structure in samples; keep the visitor's selected preferences for personalized previews. The five initial samples were checked through the actual customer composition path at desktop and mobile sizes. |
| Lead collection | Initial intake captures a contact and draft without explaining that behavior; a purchase is not required. | Preserve pre-purchase capture as requested, explain it briefly, save real-business details/preferences/selection at progress checkpoints, and record optional promotional-email preference. Sample businesses remain separate. |
| Draft safety | Exploration and a real-business draft share important browser storage. | Isolate sample state from real details, selected template, styles, image swaps, edits, and checkout context. Restore the real draft when leaving the sample. |
| Checkout boundary | Returning to pricing with an earlier real draft could accidentally use that context while browsing a sample. | Explicit sample guard prevents checkout and prevents sample URLs from replacing the real checkout context. |
| Error recovery | Stale matching callbacks can outlive navigation or a change of practice. | Cancel/invalidate obsolete requests and keep recovery actions consistent with the current draft. |
| Content guidance | “Client-readiness” scores reward arbitrary service counts, a prior website, and credential-sounding substrings; “learn” can match “RN.” | Label the indicator as supplied-detail completeness, remove keyword rewards, accept one real service/contact route/style, and keep a manual publishing checklist visible. |
| Pricing certainty | A configuration failure is treated like a confirmed zero-day trial; an incomplete preview CTA always promises a trial. | Distinguish unavailable terms from a confirmed no-trial configuration and use a neutral plan-selection CTA. |
| Paid scope | Basic sounds bespoke; ad spend is buried in Terms; custom-build implementation language obscures the post-payment scope review. | Clarify selected-template scope, separate advertising/third-party fees, explain immediate custom payment and later scope review, and link to help before payment. |
| Account navigation | “Portal” and “My Dashboard” compete without explaining the difference. | One “My websites” navigation entry reaches the existing account/website selector; all direct workspace and welcome links continue to work. |
| Keyboard and motion | No skip link; decorative motion ignores reduced-motion preferences; pricing FAQ lacks expanded state. | Add a keyboard skip target, visible focus, reduced-motion styles, and accessible FAQ state/answer relationships. |
| Small trust details | Custom-build autofill is incomplete; pricing/custom-build omit social images through metadata overrides. | Add appropriate autofill/input hints, correct a nested landmark, and complete social metadata. |

## What was already sound

- All 22 sitemap routes and five linked demo routes returned HTTP 200; a deliberately nonexistent route returned a genuine 404.
- Canonical URLs were page-specific. Robots and sitemap endpoints worked.
- Nine important public pages had no horizontal overflow at a 390px viewport and no uncaught JavaScript page errors in the initial audit.
- Existing mobile-menu Escape handling and contact name/email autocomplete worked; those behaviors were preserved.
- The demo video played. Its older template counts are a content-maintenance issue, not evidence that playback is broken.
- The latest public release proof and successful promotion workflow identify `fafde2d…`; the 14 October readiness report predates that release and must not be used as the current production status.

## Marketing data behavior

Real-business lead capture remains independent of purchase. The personalized flow collects a valid email and saves the full business-detail form, design preferences, selected template, progress stage, and email preference in the existing browser-owned draft record. Contact capture remains insert-only so knowing another person's email cannot replace their record. The existing secure draft identity remains responsible for updates.

The short form notice and Privacy Policy explain follow-up. Optional news/offers preference is recorded separately; entering a preview is not treated as promotional-email opt-in. No marketing emails are sent by this change. Sample data is excluded from real lead records. Failed saves must remain visible and retryable rather than being reported as captured. These are progress-checkpoint saves, not a claim that every abandoned keystroke, uploaded byte, or client-side edit is in a marketing database.

## Next priorities at the first audit

The subsequent [customer-control follow-up](OWNER_CONTROLS_2026-10-16.md) implements an unpaid scope-review path, separate account/public contact emails, practice-specific manual launch reviews, and a factual customer help page. The operational promises, catalogue repairs, and measurement work below still require their own evidence; this table records the original prioritization.

| Priority | Recommended work | Why it matters | Evidence to collect |
| --- | --- | --- | --- |
| 1 | Define custom-build acceptance, hosting, revisions, and delivery expectations before payment; consider a reviewed brief/quote step. | A $500 payment before scope agreement creates avoidable uncertainty and delivery disputes. This needs an operational decision, not invented sales copy. | Pre-sale questions, scope changes, refunds, delivery time and effort. |
| 1 | Define the monthly managed service: work cadence, campaign responsibilities, approval steps, and separately funded advertising. | A credible $80 service needs a sustainable, specific delivery promise. | Time spent per account, work completed, retention and support requests. |
| 1 | Give each practice a useful final review: therapy fees/insurance/telehealth, sound-bath preparation/accessibility, coaching program format, and applicable credentials. | Make niche expertise tangible at launch. Only show checks the selected template supports; distinguish owner review from automated validation. | Completed reviews, corrections before launch, support issues after launch. |
| 1 | Extend catalogue review to visual legibility, theme-variation contrast, and mobile navigation, then repair and recertify affected templates. | Some technically valid designs place decorative layers above readable content, reduce CTA contrast after recoloring, or let mobile navigation dominate the first screen. | Native and customer-preview screenshots, text contrast, navigation height, and fresh affected-template certification. |
| 2 | Test the contact/booking destination from a visitor's perspective and show the owner the result. | A beautiful site with a broken contact path cannot deliver its main purpose. | Successful test contact/booking flows and time to correction; never send unsolicited test messages to real clients. |
| 2 | Record a short current walkthrough using the released interface and catalogue. | The existing video displays older counts and terminology. | Demo-to-preview completion and questions the video resolves. |
| 2 | Create the first permissioned customer story with screenshots and concrete context. | Real proof is stronger than more stock claims or template counts. | The customer's actual goal, work delivered, measurement period, and approved results. |
| 2 | Explain domain ownership, content export, cancellation, and moving away in a plain-language help page after confirming actual operational behavior. | Buyers assess future control as well as launch cost. | Ownership/export questions and cancellation reasons. |
| 3 | Tune discovery with a few verified categories such as calm, editorial, service-led, and event-led. | Help customers choose among materially different designs instead of scrolling thousands of variants. | Time to selected template, selection changes, completed previews. |
| 3 | Measure the first week after launch and ask for one actionable piece of feedback. | Repeat use and a successful launch matter more than raw sign-up counts. | Launch completion, first edit, seven-day return, failure/recovery rate. |

## What to subtract or defer

- Remove unsupported conversion, speed, customer-result, and competitor claims.
- Avoid adding more template counts, fake urgency, blank proof cards, or new AI features before the first-preview and launch experience is dependable.
- Keep medical-record and patient-management implications out of website-editor terminology.
- Do not invent unlimited revisions, guaranteed outcomes, support response times, or integration support to make pricing sound complete.
- Do not loosen catalogue, ownership, billing, or deployment checks for a marketing release.

## Measurement plan

Use a small funnel: landing visit → sample or personalized preview → usable rendered preview → selected design → plan selection → completed launch → first return/edit. Record aggregate events, error categories, and consented marketing segmentation separately. Keep business free text, email addresses, and health/client information out of general analytics event properties.

Evaluate lead quality and successful launches alongside lead volume. An email captured from an unusable preview is not the same outcome as a practice launching successfully. Establish a baseline before changing more than one major acquisition message at a time; no fabricated lift percentages or arbitrary success promises are attached to this audit.

## Release and validation record

Two concrete catalogue defects reproduced both with the original trusted runtime and through customer-preview composition: `wellness_coach-2026-06-18T0600-095` places its hero overlay above `.clinical-grid`; `sound_bath-2026-02-16T11-24-27-037Z-003` lets a nearly opaque `.bg-pattern` paint above the main content. These predate the new showcase and require a separate certified repair. The visual sample is not a claim that all 5,486 source templates were visually reviewed.

The production catalogue is a certified full-library release. The application improvements require a new tested commit and new SHA-bound certification through the existing preparation, staging, connected-evidence, and promotion workflow. Existing template-render evidence can be reused only where the supported verification confirms unchanged compiler/runtime dependencies and byte-identical library artifacts. Local tests or a GitHub pull request alone do not prove production publication.

Local validation completed:

- All 835 application tests across 91 files passed; workspace lint, application/function TypeScript checks, production builds, and the production dependency audit passed.
- Factory coverage reached 431 passing tests with three existing skips. Twelve browser-admission tests initially stopped because release-download file cache consumed available container memory. After releasing clean cache and stopping the completed development server, all 34 tests in the five affected files passed without source or gate changes.
- All 13 remaining root release/schema test commands passed, including migration replay, ownership/grant checks, archive validation, and release safeguards.
- Browser coverage reached 89 distinct passing cases with one existing conditional skip across the CI suites and focused reruns. Updated tests cover sample/draft isolation, pre-purchase capture, promotional preference, failed-save retry, reset/unmount cancellation, delayed checkout handoff, reviewed sample selection, and gallery keyboard/mobile behavior.
- The existing full catalogue passed the standard original-candidate verifier: 5,486 templates, 33,963 pages, and all 196,002 retained bundle files. This verifies retained evidence and bytes; it is not a new renderer run or proof of publishing the changed application.

The accompanying pull request and release handoff record publication identifiers when available.

## Reference pages

- https://dailyclarity.org/
- https://dailyclarity.org/preview-your-business
- https://dailyclarity.org/wellness_coach
- https://dailyclarity.org/pricing
- https://dailyclarity.org/custom-build
- https://dailyclarity.org/wellness-website-checklist
- https://dailyclarity.org/privacy
- https://dailyclarity.org/terms
- https://dailyclarity.org/refund-policy
- https://www.wix.com/ai-website-builder
- https://www.squarespace.com/websites/ai-website-builder
- https://www.brightervision.com/pricing/
