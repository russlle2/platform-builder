# private_practice_therapist — Contact page (chunk 4)

This bundle contains two files for the contact page chunk of the private practice therapist site:

- contact.html — Full contact page built with the "lux_gallery" layout family and a calm, premium aesthetic. Includes required section pack (hero, values, methods, objections, testimonials, lead_magnet, cta) so the contact page reflects the content and navigation continuity from the index.
- README.md — This file.

Placeholders used (do not replace in source if using a templating system):
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

Design notes:
- Layout family: lux_gallery — emphasizes gallery blocks and large inline SVG accents.
- Three inline SVG elements are embedded directly in the HTML (avatar / hero / pattern). These act as the unique visual assets and avoid external dependencies.
- Navigation labels vary from other templates (Home, About, Paths, Approach, Book, Connect) while links point to the provided pages: index.html, about.html, specialties.html, approach.html, book.html, contact.html.
- Typography, spacing, and colors are defined in a scoped stylesheet for portability (no external fonts or CDNs).

Clinical & compliance notes included on the page:
- Confidentiality/privacy note in both the objections and footer area.
- Crisis disclaimer directing users to emergency services — included above the contact form.
- Scope/boundaries language (no emergency services via web contact; limited response windows) to set expectations.
- Simple intake form posted to {{PRIMARY_CTA_URL}} (replace with a backend endpoint or form handler). Email & phone links use mailto: and tel: with placeholders.

Accessibility & progressive enhancement:
- Marked up with semantic elements (header, nav, section, footer) and accessible text for inline SVGs.
- Forms use required attributes for minimal client-side validation.

Developer guidance:
- Replace placeholders server-side or with your templating engine.
- If you prefer separate asset files, extract the inline SVG blocks to files (assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg) and update the <svg> references accordingly.
- Hook the lead magnet and contact forms to your mailing list and booking system. Ensure backend handles PHI appropriately and meets local privacy/security requirements.

Unique content constraints followed:
- Headings, section orders, and copy phrasing are distinct and tailored for the contact page while mirroring the required sections from the index.
- Tone matches an executive-coach voice: clear, composed, collaborative — and ethically grounded.

If you need the other pages rendered in the same style (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html), I can generate them as additional chunks with varied headings, pricing frames, and program names to meet the uniqueness requirements.