Contact page and usage notes for the sound bath site (chunk 4).

Files included:
- contact.html: Full contact page with embedded CSS and JavaScript. This page contains:
  - Contact form (demo, local-only, no backend).
  - Seat selector demo: interactive grid that simulates seat selection and confirmation.
  - Packing list generator: suggests items depending on experience type selection.
  - Next-event module summary (simple computed date display for demo).
  - Guided practice modal: three micro-practices implemented purely in JS (breathing timer, journaling prompts, intention setter).
  - Contraindications/safety copy included in a responsible, brief form.
  - Navigation uses alternate labels (Gatherings, Sessions, Membership, Origin, Guides, Book, Contact).

Notes for developers:
- This is a static, self-contained page. There is no external network dependency (no CDNs or external fonts). The CSS references an SVG pattern at assets/img/pattern.svg; add a unique pattern SVG at that path if you want the textured background.
- Placeholders that must be replaced by the integration layer or a templating system:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}} (not used directly on this page but part of site-wide placeholders)
  - {{CITY}}
  - {{STATE}}

Accessibility & behavior:
- Modal uses aria-modal and toggles aria-hidden. The demo does not trap focus — for production, add focus management.
- All interactive features are client-side only for demo purposes and should be adapted to the production booking flow and server-side validation when wired up.

Customization suggestions:
- Swap the placeholder values with real contact details and CTA labels.
- Replace the packing suggestions and contraindication text with therapist-approved wording if needed.
- Implement server endpoints to accept contact messages and real reservations; then hook the form and seat selector to those APIs.

Design details:
- The page follows an earthy_warm layout family and uses clinical_calm voice in copy.
- No external imagery included; a unique SVG file at assets/img/pattern.svg is suggested for visual texture.

Chunk: sound_bath-MORE-2026-02-17T11-14-10-843Z-027 (seed 2063204081)