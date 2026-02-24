This chunk contains two files for the aromatherapy site (layoutFamily: lux_gallery, voice: warm_storyteller).

Files included:
- contact.html — the contact page with interactive tools:
  - Mood-to-Method selector: choose a current state; the recommended approach and CTA text update live. The main selector appears in the diagnostic section and a mini selector is included in the contact form.
  - Pricing Comparator: a local toggle (Monthly ↔ Package) with animated numbers for each price card. Implemented with vanilla JS and requestAnimationFrame.
  - Contact form: mock submit behavior (no external backend); status message shown after a simulated delay.
  - Safety-forward FAQ: dilution, patch testing, pets, pregnancy notes (uses "may support" language and no medical claims).

Notes:
- Placeholders used in the templates: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}. Replace as needed.
- No external assets or CDNs. The page references a local SVG pattern at assets/img/pattern.svg for background texture; ensure that file appears in another chunk of the project.
- Navigation uses a different label set and correct links to the site pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html).

Testing:
- Open contact.html in a browser. Click mood cards to see the recommendation and CTA update (CTA URL will append a mood query). Toggle the pricing switch to animate price changes.
- The form simulates sending and shows a confirmation message; adapt the submit handler to your backend endpoint when ready.

Accessibility & behavior:
- Switch supports Enter/Space keyboard activation.
- Price cards are announced via aria-live when toggled.

Design & constraints:
- Safety-forward aromatherapy copy; no medical claims. Include dilution/patch test/pets/pregnancy guidance in the FAQ.
- This chunk does not include the SVG asset; include assets/img/pattern.svg elsewhere in the repository to match the CSS reference.

If you need the complementary assets (pattern.svg) or additional pages from this project, ask for the next chunk.