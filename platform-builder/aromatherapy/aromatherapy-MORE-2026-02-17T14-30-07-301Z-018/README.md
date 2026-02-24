Project: aromatherapy-MORE-2026-02-17T14-30-07-301Z-018

This bundle provides two files for chunk 4 of the site layoutFamily=poster_hero and voiceFamily=practical_guide.

Included files:
- contact.html — the Contact / Connect page with an embedded proof gallery and a pricing comparator micro-interaction. Contains inline styles, SVG pattern, and local JavaScript. Uses placeholders you must replace when deploying.
- README.md — this file.

Placeholders to populate before publishing:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes and integration guidance:
- The contact form posts to {{PRIMARY_CTA_URL}}. If you use a server endpoint, ensure CSRF and validation are handled server-side. If you instead use a third-party booking form, update the form action and field names accordingly.
- The page intentionally embeds a unique decorative SVG pattern inline for portability. If you prefer an external asset, extract the <svg> into assets/img/pattern.svg and reference via CSS background-image.
- Accessibility: the pricing toggle includes aria-pressed attributes and the plans container uses aria-live to announce changes.
- Safety & compliance: FAQ and notes in the page are safety-forward. Maintain these guidelines: use conservative dilutions, request pregnancy/pet information, and avoid making medical claims. Use "may support" language in marketing copy.

Local features implemented:
- Proof Gallery: rotates testimonials automatically and has manual controls. Credibility badges show explanatory tooltips on hover.
- Pricing Comparator: a monthly vs package toggle animates numbers to illustrate price differences.

Customization tips:
- Update the testimonials array inside contact.html to reflect real client feedback. Keep language non-medical and consent-informed.
- Adjust price values by editing data-month and data-package attributes in the pricing elements.
- Modify colors or radii in :root CSS variables at the top of contact.html.

Files not included in this chunk but expected by the full project:
- index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html
- assets/img/pattern.svg (optional if you extract the inline SVG)

License & credits:
- This project skeleton is provided under your project terms. No external fonts or CDNs are used; everything is local to the page.

If you need the other pages or the shared assets (pattern.svg) produced now, request the next chunk and specify which assets to include.