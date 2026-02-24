Chunk 4 — contact.html and README for wellness_coach project

Files included in this chunk:
- contact.html — a complete contact page with interactive features.
- README.md — this file.

How to use
1. Place contact.html alongside the other site pages (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html) in the site root.
2. The page references placeholders that must be replaced during templating or build-time:
   - {{BUSINESS_NAME}}
   - {{TAGLINE}}
   - {{PHONE}}
   - {{EMAIL}}
   - {{PRIMARY_CTA_LABEL}}
   - {{PRIMARY_CTA_URL}}
   - {{CITY}}
   - {{STATE}}

Interactive features implemented locally (no external services):
- Progress meter / Path Map
  - Users select goals and click "Map my 30 days" to generate a 30-day visual path per habit.
  - The generator is deterministic per selection (simple seeded PRNG) so the preview is consistent while you experiment.
  - A summary area shows estimated average consistency and short suggestions with a CTA to book.

- Proof Gallery
  - Rotating testimonials switch automatically every 6 seconds and via Prev/Next controls.
  - Credibility badges include hover/focus tooltips describing what each badge means.

Design notes
- Layout follows a modern, clinical-aligned aesthetic with a warm, storyteller voice in copy.
- Navigation labels differ intentionally: Start, Approach, Offerings, Journeys, Investment, Voices, Book, Connect.
- No external fonts, images, or CDNs are used.
- The global SVG pattern asset (assets/img/pattern.svg) is expected elsewhere in the project — this chunk does not include it.

Accessibility
- Form controls are labeled.
- Tooltips are exposed on hover and keyboard focus.
- Dynamic updates use aria-live hints where appropriate.

Replacement / Integration
- Replace placeholders at build time or with your templating engine.
- The contact form is a local stub that alerts the user; hook it to your mail or lead-capture endpoint as needed.

Notes
- Keep outcome-focused language only; the page avoids medical claims and focuses on habits, outcomes, and frameworks.
- If you split assets across chunks, ensure assets/img/pattern.svg is unique and present per project guidelines.

Contact
- For integration questions, update the template placeholders or open a new task referencing the seed and layoutFamily.
