This chunk contains the Contact page and a short README for the private practice therapist template.

Files included:
- contact.html — A complete, self-contained contact page using the zen_minimal layout and a gentle therapist voice. It includes: hero, benefits, process, social proof, lead magnet, FAQ, contact form, and final CTA. It also contains confidentiality, crisis disclaimer, and scope/boundaries language.

Placeholders to replace in your build system or templating engine:
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

Notes and integration:
- The contact form posts to {{PRIMARY_CTA_URL}}. Replace with your form handler endpoint.
- This page references local SVG assets (not included in this chunk):
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg
  Ensure those files exist in your build so visual elements load.
- No external fonts, CDNs, or analytics are used.

Ethical / clinical considerations included on page:
- Confidentiality and privacy note is present.
- Crisis disclaimer with guidance to use emergency services or crisis lines.
- Scope and boundaries language clarifies that therapy is not a substitute for emergency or medical care.

Editing guidance:
- Keep the calm, non-promissory tone when adjusting copy. Avoid clinical guarantees.
- For styling changes, update the minimal CSS inside the <head> of contact.html. The layout is intentionally spare for the zen_minimal family.

If you need additional pages or SVG assets from this project (index, about, specialties, approach, fees, faq, book, and the three SVGs), request the next chunk and they will be provided.