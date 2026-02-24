Chunk 4 — contact.html and README for sound_bath site

Files included in this bundle:
- contact.html — the contact page with interactive widgets and local JS
- README.md — this file

Purpose and highlights
- contact.html implements a playful, premium-flavored contact / micro-practice page for a cohort-style sound bath offering.
- Local interactive features (pure JS, no server calls):
  - Event seat selector: mock seat maps for three upcoming cohort dates, selectable seats, and a local 'reserve' function that marks seats taken in page state.
  - Packing list generator: choose preferences (bring mat, cushions, blankets, arrive early) and create a short packing checklist rendered in-page.
  - Guided micro-practice modal: a multi-mode "Try it now" modal providing three practices:
    - Guided breathing: expanding/contracting pulse visual with timed inhale/hold/exhale cycles. Runs locally with a minute-based duration.
    - Timed journaling: start a timer and write in a textarea; saved entries are stored in localStorage if the user chooses to save.
    - Intention setting: pick or write a small intention and set/clear it (stored only in-page).
- Accessibility: basic ARIA attributes for modal, seat grid, and live regions.
- Safety: includes a contraindications disclaimer as required.

Placeholders used (preserved verbatim):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for integration and testing
- The seat map is seeded randomly on page load; refresh will reseed. Reservations are only saved in-memory and do not persist across reloads (except for journal saves which use localStorage).
- The modal is purely client-side; closing it stops active timers/intervals.
- Styles are self-contained; assets/img/pattern.svg is referenced for the diagonal pattern (ensure the SVG exists in your assets folder from other chunks).

Design choices to meet requirements
- Unique nav labels: Home / Events / Private / About / Book / Contact (different phrasing from prior templates).
- Copy intentionally avoids the listed recent signature phrases.
- Cohort framing and local demo interactions emphasize the cohort offerModel.
- Contraindication language is concise and responsible.

How to test locally
1. Open contact.html in a browser (no server required). 2. Try selecting an event and a seat; reserve to see local change. 3. Generate packing lists with different options. 4. Click "Try it now" and explore breathing, journaling, and intention modes. 5. Use the contact form to trigger the local alert (simulates submission).

If you need additional pages or adjustments in tone/structure for other chunks, list required changes and I will prepare the next bundle.