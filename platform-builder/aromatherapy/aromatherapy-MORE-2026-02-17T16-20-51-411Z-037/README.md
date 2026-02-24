Contact page for the aromatherapy site (chunk 4).

Files included in this bundle:
- contact.html — full contact page with interactive features and safety-first FAQ.

Purpose and highlights:
- Implements a "Mood-to-Method" selector: click a mood to see a recommended approach and the CTA text morphs to match the suggested action.
- Implements a "Pricing Comparator" toggle (Monthly ↔ Package) with animated numbers to help compare session pricing.
- Includes contact form and quick contact details using placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- Safety-first FAQ: includes dilution/patch-test, pets, and pregnancy advisories (no medical claims; phrasing uses "may support").

How to test interactive parts locally:
1) Open contact.html in a modern browser.
2) Mood-to-Method:
   - Click any mood button (Tired, Stressed, Fuzzy, Overwhelmed). The method panel fades and updates its heading, description, and the mood-related CTA. The main primary CTA in the hero also updates to the chosen action.
3) Pricing Comparator:
   - Click the toggle (the round knob) to switch between "Monthly" and "Package" states. The numeric prices animate smoothly to their target values.
4) Contact form:
   - Fill and submit the form. The demo uses an inline onsubmit handler that shows an alert; in a production build, wire this to your backend or form processor.

Accessibility notes:
- The pricing toggle is keyboard-focusable and responds to Enter/Space.
- Mood buttons use a simple aria-selected pattern for clarity.

Customization:
- Replace placeholders ({{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, etc.) with real content in your templating pipeline.
- The page references an SVG pattern at assets/img/pattern.svg for subtle decoration—provide a unique SVG at that path in the project.

Developer notes:
- No external assets or CDNs are used; fonts are system defaults.
- Keep the safety phrasing and FAQ intact if you edit any copy to avoid implying medical benefit.

If you need the other pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) or the project's pattern SVG, request the next chunk and I will provide them.