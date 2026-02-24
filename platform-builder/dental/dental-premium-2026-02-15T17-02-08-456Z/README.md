Dental Office Premium Template

Overview
- A modern, responsive, and accessible static website template tailored for dental practices.
- Works 100% offline. No external fonts, CDNs, or images. Uses system fonts and two local SVG assets.

File structure
- Pages at root: index.html, services.html, insurance.html, new-patient.html, about.html, reviews.html, book.html, contact.html
- Assets: assets/css/styles.css, assets/js/main.js, assets/img/avatar-01.svg, assets/img/hero-abstract.svg
- Config: template.json, fields.json

How to use
1) Open the project folder locally. You can double‑click index.html to preview in a browser.
2) Replace placeholders with your practice information:
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
   Find/replace across the project or use an external build step to inject values defined in fields.json.

Accessibility & best practices
- Semantic landmarks (header, nav, main, footer) and skip link are included.
- Sufficient color contrast and focus states.
- Forms have labels and client‑side validation (no backend required).

SEO & social
- Each page includes meta description, canonical, Open Graph, and Twitter card tags.
- JSON‑LD is included on key pages for LocalBusiness/Service/FAQ/AggregateRating where appropriate.

Customization tips
- Colors and sizing: edit CSS variables in assets/css/styles.css (:root section).
- Logos: The template uses a simple SVG mark and text. Replace brand markup if you have a logo.
- Images: Use the provided SVGs or replace them with your own local assets. Avoid external CDNs for offline capability.

Notes
- The appointment and contact forms are static. main.js provides basic validation and a friendly success message.
- Replace the map placeholder in contact.html with your preferred embed if you plan to host online (ensure CORS and privacy considerations).

License
- Provided as‑is, no warranty. You are responsible for verifying regulatory compliance (HIPAA, PCI, etc.) for any deployments.
