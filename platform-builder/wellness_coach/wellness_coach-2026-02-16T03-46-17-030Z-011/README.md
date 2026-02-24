Project: {{BUSINESS_NAME}} — Wellness Coach Site

This bundle contains the contact page and a project README for a luxury gallery-style wellness coach website.

Files included in this chunk:
- contact.html — contact page designed for the lux_gallery layout. Includes:
  - Hero summary and ripple previews of story, framework, and programs.
  - Right-hand contact card with avatar (assets/img/avatar.svg) and contact form.
  - Form with basic client-side handling (no external services).
  - Lead magnet promotion and testimonial snippets.
  - Uses placeholders throughout; update with your real values.

Placeholders to replace or use with a templating engine:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{COACH_NAME}}
- {{CREDENTIALS}}
- {{CITY}}
- {{STATE}}

Design notes:
- Layout family: lux_gallery — large image/graphic references and restrained motion.
- No external fonts, CDNs, or analytics are included.
- Assets referenced (add to project):
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg

Accessibility & behavior:
- Simple form behavior is implemented inline — adapt to your serverless form handler or backend.
- All links point to the local pages in this project: index.html, about.html, programs.html, pricing.html, testimonials.html, book.html, contact.html

Customization checklist:
- Replace placeholders with real content or integrate with your templating system.
- Provide the required SVGs in the assets/img directory.
- Hook the contact form to your email/CRM endpoint or a service like Formspree if needed.
- Review copy to align with brand voice and compliance (no clinical claims).

Notes on site structure:
- This chunk only contains contact.html and README.md. Other pages (index, about, programs, pricing, testimonials, book) are in other chunks.
- Ensure nav labels remain consistent across pages; slight variations were intentionally used (e.g., "Paths", "Invest", "Stories").

If you need alternate contact form behaviors (file upload, calendar integration, conditional questions), tell me which provider you want and I will add a tailored implementation.