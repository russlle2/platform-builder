Slug: aromatherapy-2026-02-16T16-21-06-818Z-017
Seed: 3408332974
Layout family: clinic_modern
Voice family: clinical_calm
Offer model: hybrid

Chunk: 4 — contact page + README

Files included in this chunk:
- contact.html — contact page built for a clinical-style aromatherapy practice. Contains an inline SVG texture/pattern, gradient backgrounds, accessible form, contact details, safety-forward notes, and a small FAQ accordion focusing on dilution, patch testing, pets, and pregnancy considerations.
- README.md — this file with metadata.

Placeholders present in HTML:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}}

Notes & constraints observed:
- No external assets, fonts, or CDNs referenced.
- Visual richness achieved with CSS gradients and an embedded SVG pattern.
- All language is safety-forward; no medical claims.
- Navigation labels intentionally vary ("Welcome", "Offerings", "Boutique", "Investment", etc.) to avoid repetition across pages.

Integration guidance:
- The contact form posts to {{PRIMARY_CTA_URL}}. Adjust action to your form handler or mail-to as needed.
- Site-wide SVG asset referenced elsewhere should be placed at assets/img/pattern.svg. This page includes an embedded pattern so it renders standalone.
- Remaining pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) are part of the full site but not included in this chunk.

Accessibility & privacy:
- Simple accessible headings and aria attributes are used.
- The form includes a privacy note and a reminder that the service is not a replacement for medical care.

Design intent:
- Clean, clinical-calm tone suitable for an aromatherapy practitioner who emphasizes safety and personalized care.
- Layout is responsive and keeps interactions minimal for an inviting user experience.

End of chunk 4.