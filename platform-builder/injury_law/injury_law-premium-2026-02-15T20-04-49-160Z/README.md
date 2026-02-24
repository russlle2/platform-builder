Template: Injury Law Premium
Slug: injury_law-premium-2026-02-15T20-04-49-160Z

Overview
- A premium, accessible, multi-page static website template tailored for personal injury law firms.
- 100% offline-capable. No external images, fonts, or CDNs. Uses a system font stack and local SVG assets.

Pages
- index.html (Home)
- practice-areas.html
- case-results.html
- process.html
- about.html
- faq.html
- consult.html (Free consultation form)
- contact.html (Contact details + message form)

Local Assets
- assets/css/styles.css
- assets/js/main.js
- assets/img/avatar-01.svg
- assets/img/hero-abstract.svg

Placeholders (replace across the site)
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

Instructions
1) Clone the repo and open index.html in a browser. Everything works offline.
2) Search/replace placeholders with your firm details. Keep consistent formatting for tel: links.
3) Customize colors by editing CSS variables at the top of assets/css/styles.css.
4) Forms are client-side only by default (no backend). main.js handles basic validation and a simulated submit. Integrate with your backend by updating the submit handler.
5) All pages include SEO, OpenGraph, and basic Schema.org JSON-LD.

Accessibility
- Semantic HTML, high-contrast colors, visible focus states, skip link, aria labels.
- Prefers-reduced-motion respected.

Performance
- System font stack (no font downloads).
- Lightweight CSS/JS, responsive images (SVG).

License
- Provided as-is. You are responsible for compliance with advertising and ethical rules in your jurisdiction.
