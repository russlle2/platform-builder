Dental Office Premium Template

Overview
- Niche: Dental Office
- Slug: dental-premium-2026-02-15T15-50-17-813Z
- Fully static, responsive, accessible, and SEO-ready.
- No external assets. Works offline after clone.

Structure
- Pages at project root: index.html, services.html, insurance.html, new-patient.html, about.html, reviews.html, book.html, contact.html
- Assets: assets/css/styles.css, assets/js/main.js, assets/img/avatar-01.svg, assets/img/hero-abstract.svg
- Config: template.json, fields.json

Placeholders (replace in all pages as needed)
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

Local development
- Open any HTML file in a browser. No build step required.
- Optional: run a simple static server for clean URLs.
  - Python: python3 -m http.server 8080
  - Node: npx serve .

Accessibility & SEO
- Landmarks: header, main, footer. Skip link included.
- Color contrast and focus styles provided.
- Descriptive titles, meta descriptions, OpenGraph tags on every page.
- JSON-LD structured data for Dentist.

Forms
- book.html and contact.html include demo forms.
- main.js intercepts submit, performs minimal validation, and displays a success message (no backend).
- Replace with your own endpoint or embed scheduler by updating {{PRIMARY_CTA_URL}}.

Customization tips
- Update colors in assets/css/styles.css under :root.
- Replace copy per page with your practice details.
- Add more images to assets/img and reference them locally if needed.

License
- Provided as-is, without warranty. You are responsible for HIPAA/PHI compliance if collecting patient information.
