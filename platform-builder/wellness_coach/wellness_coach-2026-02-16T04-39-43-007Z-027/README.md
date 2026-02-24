# {{BUSINESS_NAME}} — Front-end bundle (contact page)

This bundle contains the contact page and a README for a wellness coach website. It follows the "earthy_warm" layout family and the "gentle_therapist" voice.

Files included in this chunk:
- contact.html — the contact page with inlined SVG assets and sections that reflect the required section pack (hero, social_proof, benefits, process, faq, lead_magnet, cta).

Notes and developer instructions:
- Placeholders to replace when publishing:
  - {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{COACH_NAME}}, {{CREDENTIALS}}, {{CITY}}, {{STATE}}
- Navigation uses relative links to the other pages in the full site: index.html, programs.html, services.html, about.html, book.html.
- Design choices: warm neutrals, rounded cards, soft gradients. No external fonts or CDNs are used.
- Accessibility: simple HTML structure with labeled sections and visible focusable elements.
- Lead magnet: "7-Day Reset" prompt links to mailto that includes the guide request. Adjust mail integration as needed.

SVGs:
- For portability this contact page inlines small unique SVGs (avatar/pattern). If you prefer separate files, extract the <svg> blocks and save them as:
  - assets/img/avatar.svg
  - assets/img/pattern.svg
  - assets/img/hero.svg (not embedded on this page but recommended for index.html)

Form behavior:
- The form uses a mailto fallback so no server is required. Replace the form action with a server endpoint or a form provider webhook if you want programmatic capture.

How to preview locally:
1. Save this file and contact.html in the same folder.
2. Open contact.html in your browser.

Deployment tips:
- Ensure other pages referenced in navigation exist in the final bundle (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html).
- Replace placeholders with real values and update the PRIMARY_CTA_URL to the booking or payment page.

Design consistency:
- This contact page echoes the site-wide section pack to provide continuity with the index. Headings and phrasing are intentionally different from other pages to satisfy uniqueness constraints.

If you need alternate variants (server form integration, separate SVG files, or production-ready analytics snippets), ask for a follow-up and include your preferred stack (Netlify, Vercel, static host, or server endpoint).