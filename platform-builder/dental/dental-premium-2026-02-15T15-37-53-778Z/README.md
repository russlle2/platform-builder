Template: Dental Office Premium (dental-premium-2026-02-15T15-37-53-778Z)

Overview
- A modern, responsive, accessible multi-page website template for a dental office.
- 100% offline-ready. No external fonts, images, or CDNs. Only local assets are used.
- System font stack, semantic HTML, SEO + OpenGraph on every page.

File structure
- index.html (Home)
- services.html (Services)
- insurance.html (Insurance & Financing)
- new-patient.html (New Patients + Intake)
- about.html (About the Practice)
- reviews.html (Patient Reviews)
- book.html (Appointment Request)
- contact.html (Contact)
- assets/css/styles.css (Styles)
- assets/js/main.js (Interactions: mobile nav, accordions, basic form handling)
- assets/img/avatar-01.svg (Placeholder avatar)
- assets/img/hero-abstract.svg (Abstract hero art)
- template.json (Metadata)
- fields.json (Editable fields / placeholders)

How to use
1) Replace placeholders across pages with your details:
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
2) Optional: adjust copy to match your services and tone.
3) Deploy to any static host (Netlify, Vercel, S3/CloudFront, etc.).

Accessibility and performance
- Keyboard-accessible navigation with a visible focus strategy via browser defaults.
- Skip-to-content link for screen readers/keyboard users.
- Sufficient contrast and large touch targets.
- Lightweight: system fonts, SVG images, minimal JavaScript.

SEO
- Descriptive titles and meta descriptions per page.
- Canonical, OpenGraph, and Twitter card tags included.
- JSON-LD structured data (Dentist/Organization/Service/HowTo) on relevant pages.

Customization tips
- Colors: edit CSS variables in assets/css/styles.css (e.g., --brand-600, --brand-700, --accent-500).
- Logos: by default, a simple gradient brand mark is used. Replace with your own mark or inline SVG if desired.
- Imagery: keep images local. You may add more SVGs or images to assets/img and reference them relatively.

Forms
- Forms use client-side validation and show an inline success message (no backend required). For production, connect to your form handler or EHR.
- No sensitive information is transmitted by default.

Legal
- You are responsible for HIPAA compliance and privacy policies.
- This template is provided under the MIT License.
