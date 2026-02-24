# aromatherapy-2026-02-16T17-14-15-913Z-028 — contact page bundle

This chunk includes two files for the site layoutFamily "clinic_modern" and voiceFamily "practical_guide":

- contact.html — the contact & FAQ page, containing the required sections: hero, ritual, what_to_expect, schedule, pricing, faq, cta.
- README.md — this file.

Notes for developers:
- Placeholders to replace in contact.html: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{FAVORITE_BLEND}}.
- The page is self-contained (no external fonts or CDN). Visual textures come from an inline SVG and CSS gradients.
- The contact form is a demo (onsubmit shows an alert). Replace the form action/handler with your booking endpoint or mailing integration.
- Safety-first content is included in the FAQ (dilution, patch testing, pets, pregnancy). No medical claims are made.

How to preview:
1. Drop this file (contact.html) into your site folder alongside the other site pages (index.html, services.html, etc.).
2. Open contact.html in a browser to preview.

Accessibility & behavior:
- Links use standard anchors to other site pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html).
- The layout is responsive and will stack on smaller viewports.

Design choices:
- Navigation labels vary subtly from other pages (e.g., "Offerings", "Boutique", "Investment", "Reach").
- A unique inline SVG pattern is used as the visual background for the hero sidebar to ensure visual distinctiveness.

If you need additional pages or the SVG exported as a separate asset, request the next chunk and include instructions to generate assets/img/pattern.svg separately.