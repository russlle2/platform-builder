Contact page and developer notes for chunk 4

Files included:
- contact.html  — full contact page with interactive aroma wheel, rotating testimonial "Proof Gallery", contact form, and FAQ.

Placeholders to replace in any environment:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

How to test locally:
1. Drop this file into the project root (or the page folder) together with other site pages (index.html, services.html, etc.).
2. Ensure assets/img/pattern.svg exists in the project (this chunk references that path for background styling in the site theme). The SVG pattern file is created in another chunk — if you are testing standalone, create a simple SVG at that path or remove the reference.
3. Open contact.html in a modern browser. The page is static and the JS runs locally — no server is required for the interactive behaviors.

Interactive features implemented here:
- Aroma wheel: an SVG-based ring layout with top / middle / base notes. Hover any note (in the wheel or the legend) to show a concise, safety-forward description in the description box.
- Proof Gallery: rotates testimonials every 5 seconds in the hero proof area and includes credibility badges with hover tooltips using data-tooltip attributes.

Safety and content notes:
- All language is intentionally safety-forward and does not include medical claims. Terms like "may support" are used in guidance and FAQ.
- The FAQ includes dilution guidance, patch test instructions, pet and pregnancy notes, and a reminder that sessions are not medical treatment.

Developer tips:
- The contact form is a frontend placeholder: it prevents default submit and shows a local confirmation. Wire to your server endpoint or form service by replacing the submit handler.
- The aroma wheel is rendered from JS arrays inside contact.html. To add or change notes, edit the topNotes/middleNotes/baseNotes arrays in that file.
- Test accessibility: note elements are focusable and will show descriptions on keyboard focus.

Styling:
- All styles are inline in contact.html for portability. Adjust CSS variables at the top of the style block to match your palette.

If you need this page adapted to a different layout family or split into components, tell me which pieces you'd like modularized (SVG component, testimonials module, form handler) and I will produce chunked files accordingly.