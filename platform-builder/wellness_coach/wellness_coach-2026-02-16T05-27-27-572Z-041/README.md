# wellness_coach-2026-02-16T05-27-27-572Z-041 — chunk 4

This bundle contains the contact page and supporting SVG assets for the lux_gallery layout of the wellness coach template.

Included files:
- contact.html — full contact page with hero, brief story/ framework teasers, programs/pricing links, CTA, and a contact form. Uses placeholders for easy templating:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{COACH_NAME}}
  - {{CREDENTIALS}}
  - {{CITY}}
  - {{STATE}}

- assets/img/hero.svg — unique gallery-style illustration used in the hero visual.
- assets/img/avatar.svg — simple avatar illustration used in header/brand.
- assets/img/pattern.svg — small decorative pattern used next to lead magnet.

Notes:
- No external fonts, scripts, or CDNs are referenced. All artwork is local SVG.
- The contact form uses mailto:{{EMAIL}} for a minimal no-backend experience. Replace or wire up to your form handler as needed.
- The page follows the lux_gallery brief: large visual, restrained motion, polished cards.
- Navigation labels intentionally vary from other templates (e.g., "Work With Me", "Paths", "Investment") — keep them linked to the correct pages when integrating the full site.

Integration:
- Place the files into your site root. Keep the assets folder at "assets/img/" so the images resolve.
- Replace placeholders with actual values or use your templating engine to populate them.

Accessibility & Best Practices:
- Alt attributes are present on images for screen readers.
- The layout is responsive; test at narrow widths to ensure the grid stacks correctly.

If you need a version of this page wired to a specific form provider (Typeform, ConvertKit, Formspree), tell me which provider and I will update the form action and include any required hidden fields.