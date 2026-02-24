# Contact Page (chunk 4)

This bundle contains two files for the contact page slice of the aromatherapy site:

- contact.html — Self-contained contact page with the required section pack: hero, ritual, what_to_expect, schedule, pricing, faq, cta. Uses placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{FAVORITE_BLEND}}.

- README.md — This file: usage notes.

Notes for integrators:

- The HTML is intentionally self-contained (no external assets). It includes an inline SVG pattern for background texture.
- The design follows "aura_editorial" layout cues and a playful_premium voice: light, confident, safety-forward copy.
- The contact form posts to {{PRIMARY_CTA_URL}}. Replace with your form endpoint or process server-side submissions accordingly.
- Accessibility: semantic headings and landmark sections are present. Adjust ARIA and contrast as needed for your branding.
- Global requirements such as the separate assets/img/pattern.svg should be provided in another chunk; this page contains its own inline pattern to ensure visual richness if that asset is not yet present.

Safety & content constraints:

- No medical claims are made anywhere in this page. FAQ includes dilution, patch-test, pet safety, and pregnancy notes as required.

Customisation:

- Replace placeholders prior to publishing.
- Adjust color tokens at the top of the <style> block to match brand palette.

Integration checklist:

- [ ] Supply real endpoints for forms and booking links.
- [ ] Confirm pricing and scheduling details.
- [ ] Add analytics/snippets as required (server-side preferred for privacy).

End of chunk 4 README.