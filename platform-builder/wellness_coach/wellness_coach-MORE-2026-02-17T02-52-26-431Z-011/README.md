# wellness_coach-MORE-2026-02-17T02-52-26-431Z-011 — Chunk 4

This chunk contains two files for the wellness coaching site (layoutFamily: glass_morphism, voiceFamily: minimal_poetic):

- contact.html — the contact page with interactive Proof Gallery and Pricing Comparator micro-interactions.
- README.md — this file.

Notes & features

- Placeholders used (do not replace in code before deploying):
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}

- Nav links align with the full site pages (unique labels chosen):
  - Home -> index.html
  - About -> about.html
  - Offerings -> services.html
  - Journeys -> programs.html
  - Rates -> pricing.html
  - Stories -> testimonials.html
  - Book -> book.html
  - Connect -> contact.html

- Interactive elements (all local JS, no external libs):
  - Proof Gallery: rotates through testimonial snapshots every 6s, manual prev/next, and badge tooltips. Badges dim when not relevant to a snapshot; hover/focus reveals explanatory tooltip.
  - Pricing Comparator: toggle (Monthly / Package) with animated number transitions; keyboard-accessible switch (Enter/Space).

- Visual style aims for glass-morphism with a soft, poetic tone. The design references an external SVG pattern at assets/img/pattern.svg for the page background. That asset is part of another chunk — ensure the file exists in assets/img/ to match the visual.

Accessibility & behavior

- Buttons and interactive badges are keyboard-focusable.
- Form has light client-side validation to prevent empty submissions.
- No external fonts or CDNs are used; fonts fallback to system stacks.

Deployment

- Place this file into the root of your static site alongside the other HTML pages.
- Ensure assets/img/pattern.svg exists (unique pattern created in a separate chunk) and replace placeholder values with real business values.

If you need the SVG pattern or additional pages from this project in the same format, request the next chunk.
