Dental Premium Multi-Page Website Template

Overview
- Niche: Dental Office (dental)
- Slug: dental-premium-2026-02-15T16-45-30-614Z
- 100% static, responsive, and accessible. Works offline after git clone.
- No external images, fonts, or CDNs. Uses system font stack.

Structure
- Pages (root): index.html, services.html, insurance.html, new-patient.html, about.html, reviews.html, book.html, contact.html
- Assets: assets/css/styles.css, assets/js/main.js, assets/img/avatar-01.svg, assets/img/hero-abstract.svg
- Config: template.json, fields.json

Placeholders (replace everywhere)
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{ADDRESS}}
- {{CITY}}
- {{STATE}}
- {{ZIP}}
- {{HOURS}}
- {{PRIMARY_CTA_URL}}
- {{PRIMARY_CTA_LABEL}}

How to Use
1) Open the HTML files in a code editor.
2) Replace all placeholders with your business information. You can search for {{BUSINESS_NAME}} to locate all occurrences.
3) Update page titles and meta descriptions if desired (already include placeholders for SEO).
4) Use assets/img/avatar-01.svg as a generic staff avatar and assets/img/hero-abstract.svg for decorative hero backgrounds.
5) Open index.html in a browser to preview locally.

Forms
- Forms are static by default. They include data-enhance for basic validation.
- To direct submissions, set the form action to a service endpoint or use mailto:{{EMAIL}} (note: mailto relies on the visitor's email client).
- For demo behavior (no network), keep data-demo="true" on forms.

Accessibility Notes
- Landmarks, labels, and color contrast are designed for WCAG compliance.
- Includes a skip-to-content link and focus outlines.
- All decorative images have appropriate alt attributes.

SEO
- Each page includes: meta title, description, canonical, Open Graph, and Twitter tags.
- JSON-LD Schema.org markup for a Dentist local business using your placeholders.

Customization Tips
- Colors: tweak CSS variables in assets/css/styles.css under :root.
- Buttons and components: search for .btn, .card, .banner classes.
- Navigation: update header nav links across pages if adding/removing sections.

License
- MIT. You are free to adapt and use commercially.
