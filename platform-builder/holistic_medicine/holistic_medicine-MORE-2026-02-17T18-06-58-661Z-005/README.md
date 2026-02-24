# holistic_medicine-MORE-2026-02-17T18-06-58-661Z-005 — Contact page chunk

This bundle contains the contact page and a README for the holistic / integrative medicine site variant (layoutFamily: poster_hero, voiceFamily: mystic_modern, offerModel: intensive).

Files included in this chunk:
- contact.html — The contact / connect page with local JS widgets and accessible markup.
- README.md — This file.

Design & UX highlights:
- Poster-style hero on the contact page with a split layout (intro + contact form + quick comparator).
- Proof Gallery: rotating testimonials with credibility badges that reveal clarifying tooltips on hover. Implemented with minimal JS and pure CSS tooltips for accessibility.
- Pricing Comparator: a small monthly vs package toggle. Values animate with requestAnimationFrame for a polished micro-interaction.
- All links use the project page slugs: index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html.

Placeholders present (replace as needed):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility & notes:
- The contact form is not wired to a backend here; submitContact() simulates a response. Replace with your API endpoint as needed.
- The page includes a clear privacy/accessibility notice and emergency guidance.
- No external assets or fonts are required. The page references an SVG pattern at assets/img/pattern.svg for background texture — ensure that file exists in the broader bundle and is unique for this project.

Customization tips:
- Edit testimonial text in the contact.html script array to update rotation.
- Update pricing data attributes on the price elements (data-month and data-package) to reflect your current investment structure.
- Swap the brand initials in the .logo element with an inline SVG or image if you prefer; keep the layout responsive.

Legal & clinical note:
- The content is educational and supportive. It avoids medical guarantees and suggests using the contact form for planning and booking only.

Generated with seed: 1883704168
