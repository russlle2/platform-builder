# private_practice_therapist-2026-02-16T08-01-48-020Z-036 — Chunk 4

This bundle contains the contact page and a README for the clinic_modern template aimed at private practice therapists.

Files included:
- contact.html — Contact page with: hero, social proof, benefits, process, FAQ excerpt, lead magnet, CTA, confidentiality and crisis disclaimers, contact form (client-side only).
- README.md — This file.

Placeholders (replace in your build process):
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
- The contact page references local SVGs at assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg. Ensure those are provided in your assets folder for complete visuals.
- No external scripts, fonts, or analytics are included.
- The contact form is client-side only and shows a confirmation alert. Wire the form to your backend or a form service if you need submissions saved or emailed.
- The page includes a crisis disclaimer and confidentiality notes to align with ethical requirements for therapists.

Accessibility & behavior:
- FAQ items are toggled with accessible aria-expanded attributes.
- The layout is responsive; at smaller widths the grid collapses to a single column.

Customization suggestions:
- Update the free worksheet CTA ({{PRIMARY_CTA_URL}}) to point to a hosted PDF or lead magnet endpoint.
- Connect bookkeeping or scheduling links on Book and Investment pages when integrating the full site.

If you need the other pages (index, about, specialties, approach, fees, faq, book) or the SVG assets in this bundle, request the next chunks and note any preferred adjustments to tone, structure, or copy.