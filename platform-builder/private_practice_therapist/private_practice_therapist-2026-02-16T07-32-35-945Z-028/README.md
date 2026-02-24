This bundle contains the contact page and documentation for the private practice therapist site template.

Files included in this chunk:
- contact.html — A premium, gallery-style contact page tailored to a private practice therapist. Uses local SVGs (assets/img/avatar.svg, assets/img/hero.svg, assets/img/pattern.svg) that should be included in the project root.
- README.md — (this file)

Placeholders to replace (leave brace format for templating):
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

Implementation notes:
- The form uses a mailto action as a simple fallback. Replace with your preferred backend endpoint or JavaScript handler for production.
- No external fonts or CDNs are used. Styles are inline for portability. The design adheres to the "lux_gallery" layout family: large illustration, clean card surfaces, restrained color accents.
- Required clinical copy included: confidentiality/privacy note, crisis disclaimer, scope & boundaries, licensing note. Do not alter legal language without clinical/legal review.

Accessibility:
- Basic labels and alt text included. Review with your accessibility checklist and add ARIA attributes as needed for your integration.

Assets required (not included here):
- assets/img/avatar.svg
- assets/img/hero.svg
- assets/img/pattern.svg

Unique requirements reminder:
- Ensure that across the full site, headings, program names, pricing framing, and FAQ questions are varied to avoid repetition between pages.

If you need additional pages (index, about, specialties, approach, fees, faq, book) or help generating the SVG assets, request the next chunk and specify the visual direction for the illustrations.