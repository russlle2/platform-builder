Contact page and notes

This bundle contains the contact page (contact.html) for the aromatherapy site and a short readme.

Files included:
- contact.html: Full-contact experience with hero, rotating "Proof Gallery" (testimonials) and credibility badges with tooltips; a compact "Pricing Comparator" toggle (monthly vs package) with animated numbers; contact form; safety-forward FAQ; nav and footer.

Placeholders to replace in a deployment environment:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes on features:
- Proof Gallery: Rotates through testimonials every ~4.5 seconds and provides Prev/Next controls. Badges show accessible tooltips on hover and focus.
- Pricing Comparator: Toggle switches between 'Monthly' and 'Package' values. Numbers animate using requestAnimationFrame and a subtle easing curve.
- Accessibility: Basic aria and focus behaviors added for badges and toggle. The testimonial container uses aria-live for polite updates.
- Safety language: FAQ includes dilution, patch test, pets, and pregnancy guidance. All language avoids medical claims and uses "may support" style phrasing.

Local preview:
1. Place this file alongside the other site pages (index.html, services.html, etc.).
2. Open contact.html in your browser. No server required for basic static preview.

Assets:
- The layout references an SVG pattern at assets/img/pattern.svg for background decoration in other site sections. If not present, the page still renders correctly; add a unique SVG at that path to match the site's visual system.

Developer notes:
- No external fonts, CDNs, or images are used in this file.
- The contact form is a mock: it prevents default submission and shows a micro-success animation. Hook into your backend endpoint where indicated if you need real submissions.
- Keep copy and CTAs unique from previous templates; adjust pricing and plan names in the pricing comparator as needed.

License: Content is provided as-is for integration into your site templates.