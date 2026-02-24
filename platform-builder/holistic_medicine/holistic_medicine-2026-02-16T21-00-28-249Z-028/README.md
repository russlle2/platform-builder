This bundle provides the contact page for the holistic_medicine site (layout: split_diagonal, voice: minimal_poetic). It includes: 

- contact.html — a standalone, accessible contact page with an inline SVG background pattern and a diagonal split layout. The page contains the required section pack: hero, ritual, what_to_expect, schedule, pricing, faq, cta.

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Notes:
- No external assets are referenced; the decorative pattern is embedded inline.
- Copy avoids medical guarantees and emphasizes education and whole-person support in compliance with holistic medicine rules.
- Navigation links point to the canonical pages: index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html.

Usage:
- Replace placeholders before publishing.
- The form uses a mailto: fallback; wire up a server endpoint for production if needed.

Design details:
- The page uses CSS for visual richness (gradients, glass panels, diagonal overlay) and an inline SVG for unique patterning.
- Responsive behavior: columns stack on narrower viewports.

If additional assets are required (separate SVG file or fonts), add them to the assets folder and update the HTML accordingly.