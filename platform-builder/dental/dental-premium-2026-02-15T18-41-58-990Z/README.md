Template: dental-premium-2026-02-15T18-41-58-990Z

Overview
- A premium, accessible multi-page static website template for a Dental Office.
- 100% offline-ready. No external fonts, images, or CDNs.
- Uses system font stack and two local SVG assets.

Structure
- Pages at repo root: index.html, services.html, insurance.html, new-patient.html, about.html, reviews.html, book.html, contact.html
- Assets:
  - assets/css/styles.css
  - assets/js/main.js
  - assets/img/avatar-01.svg
  - assets/img/hero-abstract.svg
- Config: template.json, fields.json

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

How to use
1) Search/replace placeholders across all HTML files with your real content. Alternatively, use fields.json to power a build script that injects values.
2) Open index.html in a browser. All links are relative and will work from a local clone.
3) Update the OG meta tags if you prefer a custom preview image; by default, the template uses assets/img/hero-abstract.svg.

Accessibility & SEO
- Semantic headings, labels, and skip link included.
- Forms use accessible labels and basic client-side validation (no external libraries).
- JSON-LD schema for Dentist and AggregateRating where appropriate.
- Meta description, OpenGraph, and Twitter card tags on every page.

Branding tips
- Adjust CSS variables in assets/css/styles.css for colors and radius.
- Replace copy blocks with your voice while keeping structure for scannability.

Deployment
- Works as static hosting (Netlify, Vercel, GitHub Pages) or any server.
- No build step required. Just upload the folder.

Notes
- All images are local SVGs. Avatar is a generic placeholder; replace with your own if needed.
- The booking/contact forms are non-functional by default (action="#") and show a success message client-side. Hook them up to your backend or a form handler as desired.

License
- You are free to use and modify this template for commercial projects. No attribution required.
