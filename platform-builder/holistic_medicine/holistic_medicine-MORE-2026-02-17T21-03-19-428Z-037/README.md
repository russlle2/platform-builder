# Contact page — {{BUSINESS_NAME}} (holistic_medicine)

This bundle contains the contact page (contact.html) for the holistic/integrative medicine site. It is intended to be used as part of the site that includes index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html.

Files in this chunk:
- contact.html — the contact page with interactive features and an embedded single-file UI (HTML, CSS, JS).

Placeholders to replace in deployment (do not remove from template):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented locally (no external assets):
- Whole-person inventory: a checklist of domains that generates a suggested consultation agenda and a recommended follow-up cadence. The agenda is built from a small internal mapping of domain -> suggested talking points. The cadence is a heuristic depending on how many areas are selected. This is educational and labeled as such; it is not diagnostic.
- Try-it guided exercise modal (three short practices):
  - Breathing exercise: paced inhale/hold/exhale cycles with a visual circle that scales to suggest breath timing. A 3-cycle starter is provided.
  - Timed journaling: 3-minute timer with prompt selector and local save to browser storage.
  - Intention setting: quick intention + micro-step saved locally to browser storage.

Accessibility & behaviors:
- Modal is keyboard-closeable with Escape and clickable overlay to dismiss.
- Forms are client-side handled with friendly alerts for demonstration; the main contact form posts to {{PRIMARY_CTA_URL}} when using the schedule link.

Developer notes:
- The file references an SVG pattern at assets/img/pattern.svg in the project theme, but no external resources are required for functionality. Ensure the pattern file is present in the final project assets folder for visual consistency.
- The contact form submit handler uses a local alert to emulate submission and then resets the form. Replace with real form handling / API integration as needed.
- Inventory suggestions and cadence heuristics are intentionally simple and educational; modify mappings in the contact.html script if you want different phrasing or deeper logic.

Usage:
- Drop contact.html into your site root alongside the other pages.
- Replace placeholders with the real business values.
- Optionally wire contact form to the clinic scheduling endpoint or CRM by editing the form action ({{PRIMARY_CTA_URL}}) and the form submit handler.

Compliance:
- The page intentionally avoids medical claims and includes a short disclaimer stating this is educational and not a diagnosis.

If you need variants (e.g., localized language, altered cadence heuristics, or analytics hooks), request an update and specify desired behavior.