Chunk 4 — contact.html

This chunk contains two files for the aromatherapy practitioner site:

1) contact.html
- A single-file, self-contained contact page built with a glass-morphism aesthetic and a clinical, calm voice.
- Designed for a hybrid offer model (remote + in-person). Uses placeholders that must be replaced at build or runtime:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}
  - {{PRACTITIONER_NAME}}
  - {{FAVORITE_BLEND}} (not shown here but available globally)

- Navigation intentionally varies wording ("Connect" used as label for this page).
- Includes a short safety FAQ (dilution, patch testing, pets, pregnancy) as required.
- Form posts to {{PRIMARY_CTA_URL}}. Basic front-end validation is provided; serverside handling is expected in the final integration.
- Visuals are produced with CSS gradients, a compact SVG logo embedded inline, and a background reference to assets/img/pattern.svg (provided in another chunk).

Notes for integrators:
- Replace placeholders with real values during templating or build.
- Ensure assets/img/pattern.svg exists in the project root (unique SVG pattern is part of the full bundle).
- This file avoids external fonts/CDNs and relies on system fonts for accessibility.

Files in this chunk:
- contact.html — contact / connect page, accessible form, safety-first content.
- README.md — this file (explanatory).

Design/UX considerations:
- The voice is calm and clinical; the copy avoids medical claims and focuses on safety-forward language.
- CTA and booking workflow are prominent; phone fallback is provided for urgent contact.

End of chunk 4.