Project: holistic_medicine-MORE-2026-02-17T22-07-02-818Z-047

Overview:
This chunk provides the contact/connect page and a README for a small membership-focused holistic medicine front-end. The page is designed for local use (no external assets) and demonstrates two interactive features: a Mood-to-Method selector and a three-phase Timeline planner.

Files in this chunk:
- contact.html — Contact page with interactive modules and membership CTA.
- README.md — This file.

How to run:
1. Place contact.html in the same folder with the rest of the site pages (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html) and an SVG at assets/img/pattern.svg.
2. Open contact.html in a modern browser. No build step or server required for basic functionality.

Interactive features (local JS only):
- Mood-to-Method selector: click one of the mood tiles (Overwhelmed, Low energy, Curious / Exploring, Stable / Maintenance). The module updates a suggested approach title and copy, and updates the CTA label and URL fragment to carry the selected mood state.
  - Implementation notes: choices are simple divs with data-key attributes. Selecting a choice toggles the active class and updates the UI text and CTA href.

- Timeline planner: three phase boxes (Stabilize, Rebuild, Tune & Maintain). Each phase has a date input and optional checkboxes for add-ons typically used in program planning.
  - Export: clicking "Export plan summary" compiles the phase content into a plain-text file and downloads it as plan-summary.txt. This is a convenience for personal planning and record-keeping.
  - Safety and compliance: the planner includes a visible disclaimer reminding users this is educational and not a guaranteed cure or clinical diagnosis.

Placeholders (must be filled server-side or via simple find/replace):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design notes and constraints:
- Visual details use inline CSS only; no external fonts or CDNs.
- Background pattern should be provided at assets/img/pattern.svg. The page references it via CSS as an inline background-image URL; provide a site-unique SVG there.
- No external images; design relies on plain HTML, CSS, and a single SVG background.
- Tone aims for calm, clinical-friendly language without promising cures or definitive outcomes.

Accessibility:
- Mood changes update an aria-live region to assist screen readers.
- Buttons and inputs are native controls for keyboard accessibility.

Developer notes:
- The CTA for moods appends a simple fragment (e.g. #mood=overwhelmed) so downstream pages or the booking flow can pick up the user's stated need.
- If further integration is required (analytics, form submission to an API, server-side email), replace the mailto form action and add fetch/XHR handlers.

Unique choices in this chunk:
- Navigation labels differ from typical templates (e.g. "Offerings", "Method", "Programs", "Connect").
- Program naming is intentionally generic (Starter, Rebalance, Steward) to leave room for local customization on the Programs/Pricing page.

Privacy & legal:
- The pages include visible statements clarifying that the site provides educational resources and guided support; clinical care requires formal intake and consent.

If you need additional pages from this site exported or the SVG pattern generated here, request the next chunk and I will provide the remaining files and assets.