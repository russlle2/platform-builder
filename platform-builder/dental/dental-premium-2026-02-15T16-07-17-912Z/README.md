# Dental Office — Premium Multi-page Template

Slug: dental-premium-2026-02-15T16-07-17-912Z
Category: dental

Overview
- A premium, modern, and accessible multi‑page static site for a dental office.
- 100% offline ready. No external fonts, images, libraries, or CDNs.
- Responsive, SEO‑friendly, and designed with a comfort‑first aesthetic.

Contents
- index.html — Home
- services.html — Services
- insurance.html — Insurance & Membership
- new-patient.html — New Patient Guide
- about.html — About Us
- reviews.html — Patient Reviews
- book.html — Booking (appointment request)
- contact.html — Contact
- assets/css/styles.css — Styles (system font stack only)
- assets/js/main.js — Interactivity (mobile nav, mailto forms)
- assets/img/avatar-01.svg — Local avatar illustration
- assets/img/hero-abstract.svg — Decorative abstract background
- template.json — Template metadata
- fields.json — Placeholder schema

Placeholders
Replace the following placeholders across the template with your data:
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
1) Open the project locally and search/replace placeholders with your info, or programmatically inject values using fields.json.
2) Serve the folder locally (optional) or open index.html directly in your browser.
3) Deploy to any static host (Netlify, Vercel, S3, etc.). No server required.

Accessibility
- Semantic HTML structure with proper landmarks.
- Skip link to main content.
- High-contrast, keyboard‑friendly components.
- Details/summary used for FAQs.

SEO
- Each page includes unique title, meta description, OpenGraph, and Twitter card tags.
- JSON‑LD structured data for Dentist/Organization/Service/Schedule.

Forms
- No backend required. Forms use a mailto flow via JavaScript.
- On submit, the visitor’s email client opens with a prefilled message to {{EMAIL}}.
- If mailto is blocked, the page displays a helpful notice; include your email prominently as a fallback.

Branding
- System font stack only for performance and offline compatibility.
- Colors can be customized in assets/css/styles.css via CSS variables.

Notes
- The template intentionally avoids external embeds (e.g., maps) to remain fully offline. Map sections use a decorative placeholder.
- Keep asset paths as provided; all assets are local and load offline.

License
- Provided as‑is, free for personal and commercial use. No attribution required.
