HVAC Premium Template

Overview
- Niche: HVAC (Heating, Ventilation, and Air Conditioning)
- Slug: hvac-premium-2026-02-15T10-18-42-091Z
- Fully static, responsive, and accessible. Works offline. No external assets or fonts.

Structure
- index.html — Homepage
- services.html — Detailed services
- pricing.html — Transparent pricing and membership plans
- financing.html — Financing options and FAQs
- about.html — Company story and team
- reviews.html — Testimonials and review form (static)
- book.html — Booking form (static, enhanced with JS)
- contact.html — Contact details and form
- assets/css/styles.css — Styles (system font stack only)
- assets/js/main.js — Lightweight interactivity (mobile nav, forms, toasts)
- assets/img/avatar-01.svg — Avatar/team placeholder
- assets/img/hero-abstract.svg — Decorative hero/OG image
- template.json — Template metadata
- fields.json — Placeholder field definitions

Placeholders to customize
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
1) Open the project in your editor or CMS.
2) Search and replace each placeholder with your business information.
3) Optionally adjust colors in assets/css/styles.css by editing CSS variables at the top.
4) Deploy to any static host (GitHub Pages, Netlify, etc.). No build step required.

Accessibility & SEO
- Includes skip link, semantic landmarks, and focus styles.
- Forms use associated labels and native validation.
- Each page includes descriptive titles, meta descriptions, Open Graph tags, and a relevant JSON‑LD snippet.

Notes
- The review and booking forms are static demos. The main.js script provides client‑side validation feedback and a success message. Connect to your backend or form service to capture submissions.
- All imagery is local SVG and safe for offline use.

License
- MIT — Use, modify, and deploy freely. Attribution appreciated.
