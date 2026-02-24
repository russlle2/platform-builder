# Contact Page — {{BUSINESS_NAME}} (chunk: aromatherapy-2026-02-16T15-47-17-562Z-010)

This chunk provides the contact page and developer notes for the aromatherapy site.

Files included in this bundle:
- contact.html — Complete responsive contact page, safety-forward copy, VIP Day mention, appointment form (static demo), varied navigation labels.
- README.md — This file.

Design & voice notes:
- layoutFamily: bold_playful — bright gradients, rounded cards, confident headings.
- voiceFamily: practical_guide — clear, instructive, safety-forward language.
- offerModel: vip_day — VIP Day is mentioned prominently in hero, pricing, and offers panels.

Placeholders left for runtime injection (do not replace in templates until rendering):
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

Developer guidance & integration:
- Navigation labels intentionally vary from other pages: e.g., "Offerings" instead of "Services", "Our Practice" instead of "About".
- The page references a decorative SVG asset at assets/img/pattern.svg (class .pattern-bg). Ensure the project includes a unique SVG pattern in that path. The global site layout expects a pattern.svg for visual richness.
- No external fonts or CDNs used. Font stack uses system fonts for quick loading.
- The contact form is static and demonstrates client-side validation and a simulated send. Replace the form handler to integrate with your backend or form service of choice.

Aromatherapy & safety requirements:
- All copy is intentionally safety-forward. Avoids medical claims and directs clients to disclose pregnancy, breastfeeding, medications, and pet concerns.
- If you add more content or FAQ, include information about dilution, patch testing, pet safety, and pregnancy guidance. Keep direct medical advice out of copy; instead recommend consulting a healthcare provider when appropriate.

Accessibility & responsiveness:
- Simple semantic structure: header, nav, main, footer. Form fields include labels.
- Layout collapses to single column under 900px.

Customization tips:
- Update placeholders with real values before publishing.
- Replace the simulated form handler (handleSubmit) with an API call or form provider webhook.
- Add or refine the testimonials and pricing to match actual offerings.
- Ensure assets/img/pattern.svg is unique per project as required.

Notes about uniqueness and chunking:
- This chunk intentionally does not reuse headings or section orders from other templates. Keep titles and metaphors distinct on other pages.
- The global site must also include index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html.

Contact for the build:
- If you need variants (dark mode, print styles), request an additional chunk.

Thank you — this page is optimized for clarity and conversion while remaining safety-first for aromatherapy practice.