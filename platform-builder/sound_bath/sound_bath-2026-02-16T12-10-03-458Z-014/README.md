# sound_bath — contact

Slug: sound_bath-2026-02-16T12-10-03-458Z-014
Seed: 3660474864
Layout family: bold_playful
Voice family: mystic_modern
Offer model: retail_addon

Chunk: 4 — Files included in this bundle:

- contact.html
- README.md

Purpose

This bundle provides the contact page for the Sound Bath Events site. It is designed to be sensory and premium while remaining clear and actionable. The contact page includes the required section pack: hero, myth_vs_truth, pillars, case_notes, faq, cta.

Placeholders

The HTML contains the following placeholders which must be replaced or served dynamically:

- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{FACILITATOR_NAME}}
- {{VENUE_NAME}}
- {{NEXT_EVENT_DATE}}

Notes

- Visual richness is implemented with CSS gradients, a subtle background SVG pattern reference at `assets/img/pattern.svg`, and layered cards. No external fonts or CDNs are used.
- The page includes safety and contraindication guidance, a clear session flow, and a retail add-ons callout to match the retail_addon offer model.
- Navigation labels vary subtly from other pages; ensure links remain correct when integrating.

Integration

- Place this file alongside the other HTML templates listed in the project root.
- Ensure `assets/img/pattern.svg` (unique to the project) is available at the referenced path for the decorative background.
- Hook the form `action` to your server endpoint or static site form provider.

Accessibility

- The page uses semantic sections, clear labels, and appropriate contrast for readability.

License

- This bundle is generated for the project and may be adapted per project license requirements.