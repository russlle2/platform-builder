# Dental Office Premium Template

Slug: dental-premium-2026-02-15T15-02-10-116Z
Category: dental

Overview
- A premium, responsive, accessible static website template for a modern dental practice.
- Works fully offline after clone. No external fonts, CDNs, or images.
- System font stack only.

File structure
- index.html
- services.html
- insurance.html
- new-patient.html
- about.html
- reviews.html
- book.html
- contact.html
- assets/css/styles.css
- assets/js/main.js
- assets/img/avatar-01.svg
- assets/img/hero-abstract.svg
- template.json
- fields.json

Placeholders to replace
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

Usage
1. Replace placeholders across pages with your practice details (or use a build step to inject values).
2. Open index.html in a browser to preview locally.
3. Deploy the folder to any static host.

Accessibility & SEO
- Semantic headings, accessible nav with skip link, visible focus states, sufficient contrast.
- Meta description, canonical, Open Graph & Twitter tags on every page.
- LocalBusiness schema JSON-LD on the home page.

Customization tips
- Adjust colors in assets/css/styles.css under :root variables.
- Edit copy in each page section to fit your brand voice.
- Replace SVGs in assets/img if desired; keep local references only.

Notes
- Forms are static and demonstrate structure and validation UX; wire them to your backend or a forms service as needed.
- The booking page generates sample time slots client-side for demo purposes.
