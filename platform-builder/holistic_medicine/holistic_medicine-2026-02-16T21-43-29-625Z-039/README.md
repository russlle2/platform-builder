Project: holistic_medicine (chunk 4)

This bundle contains the contact page and a README for the holistic/integrative medicine site.

Metadata
- Slug: holistic_medicine-2026-02-16T21-43-29-625Z-039
- Seed: 192432786
- Layout family: lux_gallery
- Voice family: mystic_modern
- Offer model: retail_addon

Files included in this chunk
- contact.html  — Contact / Connect page with messaging form, practitioner info, process, FAQs, lead magnet, testimonials, and a sticky CTA.
- README.md     — This file with metadata and deployment notes.

Placeholders used (must be replaced during deployment)
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Design notes
- Visual richness is provided via CSS gradients, glass-like cards, and an inline SVG backdrop (#bgPattern). No external assets or CDNs are referenced.
- The tone emphasizes education and whole-person care; it avoids promises or guaranteed cures.
- Navigation labels are intentionally varied (e.g., "Sanctum", "Offerings", "Connect") to meet uniqueness requirements.

Accessibility & privacy
- Focus styles included for keyboard navigation. Form fields include labels and a simple honeypot for spam reduction.
- The contact form posts to "{{PRIMARY_CTA_URL}}/contact-submit" as a placeholder; implement server-side validation and secure handling of PHI in accordance with local privacy regulations.

Deployment
- Replace placeholders with real values before publishing.
- Serve as static HTML on any web host. If form submissions are required, point form actions to a secure endpoint or use a third-party form provider and ensure TLS + proper data handling.

Notes for integrators
- If you extract the SVG to a separate file (assets/img/pattern.svg), update the HTML accordingly. The inline SVG is unique to this page and intentionally embedded to keep this chunk self-contained.
- Maintain the educational disclaimers and avoid language that implies guaranteed outcomes.

License
- Provided as-is for composition and site assembly. Modify to fit your legal and clinical policies.