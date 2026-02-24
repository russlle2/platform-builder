# contact.html and usage

This chunk includes two files for the sound bath site: contact.html and this README.

Files:
- contact.html — a self-contained contact page and interactive playground.
  - Session Planner: build session summaries (drop-in, cohort, private), export a plaintext summary with a copy button, and open your email client with the summary prefilled.
  - Event seat selector (local demo): shows upcoming events, allows simple local reservations, and updates seat counts.
  - Packing list generator: uses the seat count and planner choices to produce a tailored "what to bring" list.
  - Contact form: demo-only; "Send message" toggles a prepared state and "Prefill from planner" copies planner summary into the message field.
  - Contraindications: responsibly noted in a visible panel.

Notes for integration:
- Replace placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- No external assets are required; the page embeds a small SVG pattern as a data URI for subtle texture.
- All interactive features are local-only and do not send data to a server.

Developer hints:
- The events list is seeded in the page (eventsData). In a production build, swap that for a dynamic feed or server-rendered list.
- The planner summary is plain text to keep copy/paste and email compatibility simple.
- Accessibility: controls are basic inputs with labeled fields — consider adding ARIA roles for richer experiences.

This file set follows the project rules for a playful, premium voice and a cohort-focused offer model. The page uses a split/diagonal aesthetic and different navigation labels than other templates to ensure uniqueness.