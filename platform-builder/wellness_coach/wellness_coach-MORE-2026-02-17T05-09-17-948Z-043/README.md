# wellness_coach-MORE-2026-02-17T05-09-17-948Z-043 — chunk 4

This bundle contains the contact page and a short README for the wellness coach split_diagonal site.

Files included in this chunk:
- contact.html — Contact page with interactive features and local JS.
- README.md — This file.

Notes on contact.html:
- Placeholders used: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}. Replace these when building the full site.
- Navigation uses alternative labels (Home Base, Approach, Offerings, Journeys, Access, Stories, Reserve, Connect) and links to the canonical pages (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html).

Key interactive features (all run locally in the browser):
1) Habit builder (7‑day challenge generator)
   - Enter a clear habit name, time, start date and intensity.
   - Generates a day-by-day checklist with tiny, practical cues for each day.
   - Print the checklist (opens a printable window) or download as a text file.

2) Guided practice modal (three practices)
   - Breathing: paced inhale/hold/exhale cycles with a simple visual counter.
   - Journaling: short prompt, configurable minutes, a timer, and local save to browser storage.
   - Intention: write and save a brief intention locally; copy to clipboard.

Implementation notes:
- No external assets or CDNs are required. The page references an SVG at assets/img/pattern.svg for the header background; include a matching SVG asset when assembling the full site.
- Data saved from journaling and intentions goes to localStorage (key prefixes: wc_journal_notes, wc_intention).
- The contact form is intentionally non-submitting for this template (it shows a confirmation alert). Hook it up to your backend or form provider as needed.

Accessibility and behavior:
- Modal has role="dialog" and traps basic interactions; clicking outside closes the modal.
- All features run offline and do not send data externally.

Styling:
- Clean, clinical calm palette and compact layout consistent with the split_diagonal family.
- Uses purely CSS and inline SVG reference—no fonts are embedded or loaded.

If you need the complementary assets (pattern.svg) or other pages from the site, request the remaining chunks and I will provide the rest. 