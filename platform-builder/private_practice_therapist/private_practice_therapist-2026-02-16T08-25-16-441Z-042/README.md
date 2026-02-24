Project: private_practice_therapist (layout: lux_gallery)

Files in this chunk:
- contact.html — the contact page with hero, contact form, FAQs, process, lead magnet, CTA, professional notes
- README.md — this file

Placeholders used (replace these before publishing):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{THERAPIST_NAME}}
- {{LICENSE}}
- {{MODALITIES}}
- {{CITY}}
- {{STATE}}

Notes for implementers:
- No external assets or CDNs are referenced. The HTML expects local SVG files in assets/img/: hero.svg, avatar.svg, pattern.svg.
- Keep communications legally compliant: the page includes a confidentiality note, crisis disclaimer, and scope/limits statement. Do not modify these to make medical claims.
- The contact form uses POST to {{PRIMARY_CTA_URL}}; wire this to your email service, booking system, or server endpoint.
- Navigation links point to other pages generated in other chunks (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html). Ensure those files exist in the same folder.

Styling:
- A simple, self-contained CSS block is included in the head of contact.html. Adjust variables in :root for color theming.
- The layout follows the "lux_gallery" feel: roomy hero, panel cards, and restrained, gallery-like presentation.

Accessibility & privacy:
- Alt attributes are present for images; ensure the SVGs include accessible titles/desc as needed.
- Email/phone links use mailto: and tel: for convenience.

If you need an additional asset bundle (SVGs or other pages), request the next chunk referencing the same seed and layoutFamily.