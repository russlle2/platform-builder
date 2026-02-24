Contact page and instructions

Files included in this bundle chunk:
- contact.html  — Full contact page with embedded CSS and JS. Includes:
  - A glass-morphism aesthetic responsive layout.
  - Sound preference mixer (Gentle / Medium / Intense) that updates program recommendations and appends the selected preference to the form submission process.
  - Proof Gallery: rotating testimonials and credibility badges with accessible tooltips. Auto-rotates every 6s; manual Prev/Next controls included.
  - Contact form (local simulated submit). Placeholders use the required tokens: {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}.
  - Contraindications disclaimer included prominently near the form.

Notes for integrators:
- No external assets are loaded. The background references assets/img/pattern.svg — include a unique SVG at that path when assembling the full site.
- Nav links point to the local site pages: index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html, contact.html.
- Membership language is intentionally framed around cadence and access frequency.

How to test locally:
1. Place contact.html into your project root (or a served directory).
2. Add assets/img/pattern.svg (unique SVG pattern) so the background displays as intended.
3. Open contact.html in a browser. The page is client-only; the form shows a simulated response and does not send data to a server.

Accessibility & safety:
- Badge tooltips are reachable by keyboard (focus/blur show/hide).
- The site includes a medical & safety note; integrators should link this to fuller policies if needed.

Customization:
- Replace placeholders ({{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}) before publishing.
- Adjust auto-rotate timing from the testimonial block by editing the interval in the embedded script.

Chunk: 4 of the site build. Only contact.html and README.md are included in this chunk.