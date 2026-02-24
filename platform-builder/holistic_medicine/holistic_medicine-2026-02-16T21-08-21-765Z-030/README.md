# holistic_medicine-2026-02-16T21-08-21-765Z-030 — Contact page

This bundle contains two files for the contact page of the holistic / integrative medicine site:

- contact.html — The Contact/Connect page designed for a VIP Day offering. It contains the required sections: hero, ritual, what_to_expect, schedule, pricing, faq, cta (contact form). The design uses an inline SVG pattern, gradients, and CSS only (no external assets).

- README.md — This file (you are reading it).

Placeholders to replace in contact.html:

- {{BUSINESS_NAME}}
- {{TAGLINE}} (optional; not used in all sections)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Notes & guidance:

- The page emphasizes education and whole-person care and explicitly avoids any language that guarantees cures.
- The VIP Day flow is presented as an educational, collaborative process. Labs and supplements are described as optional and educational.
- Navigation labels vary across templates (Home, Offerings, Concerns, Method, Rates, About, Book, Connect). Ensure other pages follow similar variety but link correctly.
- Visual richness is achieved with CSS gradients and an inline SVG pattern; no external images, fonts, or CDNs are required.
- The contact form posts to {{PRIMARY_CTA_URL}}. Adjust server handling (or replace with a third-party form endpoint) as needed.
- Accessibility: headings, form labels (placeholders), and semantic elements are included. Add server-side validation and ARIA enhancements as needed.

Deployment:

- Drop contact.html into your static site or template engine. Replace placeholders with actual values.
- If you maintain a separate assets SVG at assets/img/pattern.svg, you can replace the inline SVG in contact.html to reference it instead.

Legal & clinical copy:

- Keep disclaimers visible: no guaranteed cures, testing optional, insurance variable. This template includes a short disclaimer in the hero, pricing, FAQ, and footer.

If you need alternate tone variants (softer, more clinical, or more whimsical) or additional pages (index, services, conditions, approach, pricing, about, book), ask and I will generate the remaining templates with varied headings, metaphors, and unique SVG patterns.