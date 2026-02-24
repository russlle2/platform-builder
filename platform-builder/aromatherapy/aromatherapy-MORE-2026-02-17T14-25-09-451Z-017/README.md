Contact page for the aromatherapy clinic template (layoutFamily: clinic_modern).

Files included in this bundle:
- contact.html : the interactive Connect page. Contains:
  - Header / local navigation using site links.
  - Contact form (no external submission; simple JS alert acknowledges sends).
  - Interactive Aroma Wheel (Top / Middle / Base) with hover and click descriptions.
  - Proof gallery: rotating testimonials and credibility badges with tooltips.
  - FAQ section covering dilution, patch testing, pets, and pregnancy safety notes.
  - CTA buttons use placeholders: {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}.

Placeholders to replace in your environment:
- {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}

Accessibility & behavior notes:
- The aroma wheel is SVG-based; hover and click update the descriptive paragraph.
- Testimonials rotate automatically; timing set to 5 seconds.
- Badges reveal short tooltips on hover; useful for showing affiliations without external assets.

Integration:
- Drop contact.html into your site root alongside other pages (index.html, services.html, etc.).
- No external fonts, images, or CDNs are used. The page references assets/img/pattern.svg optionally; add your own SVG pattern there if desired.

Safety / copy guidance:
- Copy uses safety-forward phrasing and avoids medical claims.
- FAQ includes guidance for dilution, patch testing, pets, and pregnancy; update as needed for local regulations.

Customization tips:
- Replace placeholder strings with real values.
- Modify testimonials in the inline script block to match your social proof.
- To integrate form with a backend, replace handleSubmit with a fetch() that posts to your endpoint.

Seed: 2272395730 | Slug: aromatherapy-MORE-2026-02-17T14-25-09-451Z-017 | voiceFamily: mystic_modern | offerModel: intensive
