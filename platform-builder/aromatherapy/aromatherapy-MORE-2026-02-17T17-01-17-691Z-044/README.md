# Contact & Tools — Aromatherapy Template (chunk 4)

This chunk contains two files for the aromatherapy website build: contact.html and README.md.

Purpose
- contact.html: a stand-alone contact page that includes:
  - A contact form that opens a mailto: to the configured {{EMAIL}} (no backend).
  - Blend builder: choose a mood/vibe and get a non-medical suggested blend, with a safety-first dilution guide, patch-test reminders, and pet/pregnancy notes.
  - A guided micro-practice modal implemented in pure JS (three short practices: breathing, journaling, intention-setting).
  - FAQ items about dilution, patch testing, pets, and pregnancy exposure.
- README.md: this file, documenting what is included and how to test it locally.

Placeholders
- The HTML uses the following placeholders which should be replaced by your templating or deployment process:
  - {{BUSINESS_NAME}} (not placed on this page but present site-wide)
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}

Features implemented (local-only)
- Blend builder
  - Select a vibe, pick inhalation or topical, choose bottle size.
  - Generates a suggested list of drops scaled to bottle size.
  - Computes a simple dilution note for topical use and gives safe-language instructions.
  - Save function downloads a simple text 'blend card' locally.
  - All content is non-medical and uses "may support" style language in copy.

- Guided micro-practice modal
  - Breathing: a 3-phase breathe/hold/exhale animated routine with timer.
  - Journaling: a 3-minute timed prompt with a text area.
  - Intention: three quick fields to record a small intention; saved locally in the modal.
  - Implemented using vanilla JS and DOM APIs; no external libraries.

Safety & Compliance
- The page intentionally avoids medical claims and includes clear safety notes: patch testing, pet guidance, pregnancy advisories.
- The FAQ explicitly calls out dilution guidance and encourages consultation of a qualified provider for pregnancy or medical questions.

Assets
- The page references a local SVG pattern at assets/img/pattern.svg for visual texture. Ensure that file exists in your project. No external fonts, images, or CDNs are used.

Local testing
1. Place this file alongside the other site pages in a static site folder.
2. Ensure assets/img/pattern.svg exists (unique pattern required elsewhere in the project).
3. Open contact.html in a browser. The form triggers a mailto: to {{EMAIL}}.
4. Use the Blend builder and the Guided Practice modal to test functionality.

Notes for integration
- Replace placeholders with your templating engine or during build time.
- This is chunk 4 of the larger site — other pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) are required for full navigation coherence.

Accessibility
- Modal uses aria-modal and role=dialog.
- Buttons and form controls are keyboard accessible.

If you need this page adapted into your component system or refactored to integrate a backend contact endpoint, I can update the form behavior and data handling.