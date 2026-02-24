Chunk: contact (chunk 4)

Files included:
- contact.html — Contact / connect page for the aromatherapy practice.

Context:
- Slug: aromatherapy-2026-02-16T18-41-46-488Z-046
- Seed: 3726753994
- layoutFamily: lux_gallery
- voiceFamily: clinical_calm
- offerModel: hybrid

Placeholders to replace at build time:
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

Integration notes:
- This chunk provides the contact page only. Link paths assume sibling pages: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html.
- The design relies on a decorative SVG at /assets/img/pattern.svg (unique per site). Add that asset in the assets/img folder when assembling the site.
- The page includes required sections from the pack (hero, myth_vs_truth, pillars, case_notes, faq, cta) arranged to offer a distinct reading order for this template.
- Follow aromatherapy safety rules: no medical claims; recommend conservative dilutions; include patch test, pets, pregnancy guidance. Keep clinical tone.

Developer notes:
- The contact form is static (demo). Replace the form action with your server endpoint or form provider as needed; a small client-side confirm is present for demo.
- Styles are inline for portability. Adjust variables at the top of the <style> block to alter brand colors or radii.
- Keep navigation labels intentionally varied across templates to meet uniqueness requirements.

Authorship: senior web designer + front-end engineer persona. Design prioritizes accessible contrast, soft gradients, SVG pattern, and CSS for visual richness without external fonts or CDNs.