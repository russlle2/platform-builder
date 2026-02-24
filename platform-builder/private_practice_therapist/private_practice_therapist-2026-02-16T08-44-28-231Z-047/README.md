# Contact Page — {{BUSINESS_NAME}}

This chunk includes the contact page and a README describing its purpose. Files:

- contact.html — A premium, gallery-style contact page for a private practice therapist. References local SVGs in assets/img (hero.svg, avatar.svg, pattern.svg).

Placeholders used (keep these intact so they can be programmatically replaced):
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

Notes for integrators:
- The page is self-contained with internal CSS; no external fonts or CDNs are used.
- The form posts to `/submit-contact` (placeholder). Update form action and server handling as needed.
- The page references these local SVG assets (expected in the project root):
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg

Clinical & legal microcopy included:
- Confidentiality note, crisis disclaimer, and scope/boundaries copy are present and intentionally conservative.

Accessibility & responsive behavior:
- Layout adapts for narrow screens via simple CSS grid changes.
- Form fields use native controls and include labels via placeholders; add explicit <label> elements if required by your accessibility standard.

Customization tips:
- Adjust colors in the :root block to match the practice brand.
- Update pricing, program names, and copy to align with your services. Ensure any clinical language remains within scope (supportive, non-claiming).

Generated for layoutFamily: lux_gallery and voiceFamily: coach_friend.
