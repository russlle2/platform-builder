# Injury Law Premium Template

A premium, multi-page static website template for personal injury law firms. Built to work fully offline with no external assets. Responsive, accessible, and SEO-ready.

Contents
- index.html (Home)
- practice-areas.html
- case-results.html
- process.html
- about.html
- faq.html
- consult.html
- contact.html
- assets/css/styles.css
- assets/js/main.js
- assets/img/avatar-01.svg
- assets/img/hero-abstract.svg
- template.json
- fields.json

How to use
1. Open the HTML files and replace placeholders with your firm details:
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
2. Optionally, automate replacement using the provided fields.json and your build system.
3. Serve the files from any static host, or open index.html directly.

Features
- No external fonts or scripts; system font stack only.
- Accessible navigation with keyboard support and skip link.
- Mobile menu with ARIA attributes and smooth transitions.
- SEO and OpenGraph meta tags on every page.
- JSON-LD structured data on the home page for LegalService.
- Reusable components: cards, stats, timeline, callouts, forms.
- Client-side validation for consultation/contact forms.

Customization tips
- Colors: adjust CSS variables in assets/css/styles.css (e.g., --brand, --gold).
- Imagery: replace the SVGs in assets/img if desired; keep local assets only.
- Copy: update page content to reflect your tone and practice focus.

Development
- CSS and JS are plain and framework-free. No build step required.
- Validate HTML with your preferred linter for best results.

License
- Provided as-is, no warranty. Ensure all content complies with your jurisdiction’s advertising rules.
