# holistic_medicine-MORE-2026-02-17T19-27-44-699Z-020 — contact page (chunk 4)

This bundle contains two files for the contact portion of the holistic/integrative medicine site:

- contact.html — Contact, intake, whole-person inventory, and two guided practice modals (breathing + journaling).
- README.md — This file.

Purpose and features
- A focused contact/intake page intended to collect a concise inquiry and to help visitors prepare for a consultation.
- Whole-person inventory: visitors check areas of life to explore; the script composes a suggested consultation agenda, starter tasks, and a follow-up cadence. This runs purely in-browser (no backend required).
- Two "Try it now" guided exercises implemented with local JS + HTML: a paced breathing exercise (animated circle, 5-minute default) and a guided journaling/intention exercise (three prompts with timers). Each runs in a modal overlay and uses only local code and CSS.
- Lightweight contact form with client-side validation simulation and a demo filler to produce a sample inquiry.
- Inline SVG pattern embedded via a data URL for a unique visual background (no external assets). Note: the broader site template referenced an assets/img/pattern.svg; here the pattern is embedded directly to keep this chunk self-contained.

Accessibility & tone
- Educational and supportive language; no claims of cures or medical guarantees.
- Minimal ARIA use for the modal; keyboard / focus flow should be extended in integration if needed.

How to run
1. Place `contact.html` in the same folder as the rest of the site pages (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html).
2. Open `contact.html` in a modern browser. All functionality runs client-side.

Placeholders (must be replaced upstream)
- {{BUSINESS_NAME}} — business or clinic name
- {{TAGLINE}} — not used on this page but present across templates
- {{PHONE}} — phone number
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — the main CTA label used in the hero button
- {{PRIMARY_CTA_URL}} — not used on this page, replace if linking externally
- {{CITY}} / {{STATE}} — location placeholders

Design notes and uniqueness
- Nav labels are intentionally different from typical sets (Home, Offerings, Ailments, Method, Invest, Team, Book a Visit, Connect).
- The whole-person inventory generates a succinct agenda and a pragmatic follow-up timeline, intended to be copy-pasteable into an intake note.
- Two separate guided exercises are included to offer immediate, private support before a visitor decides to book.
- Visual pattern is unique and embedded inline to avoid external dependencies.

Important cautions
- This page is front-end only: form submissions are simulated for the demo. Integrate with your backend or a form handler for production use.
- The site is educational and supportive only. For emergencies or acute medical concerns, direct users to emergency services.

If you need additional pages from this template (index, services, conditions, approach, pricing, about, book) or a separate assets folder with a standalone SVG file (assets/img/pattern.svg), request the next chunk and specify whether you want the SVG as a separate file or embedded.
