# Aromatherapy Practitioner Website — Chunk 4 (contact + README)

Project slug: aromatherapy-2026-02-16T16-10-48-315Z-015
Seed: 475316860
Layout family: glass_morphism
Voice family: clinical_calm
Offer model: hybrid

This bundle contains only two files for chunk 4:

- contact.html — the contact/connect page for the site. Includes required sections (hero, diagnostic, plan, micro_habits, pricing, cta) arranged and written in a safety-forward, clinical-calm voice. The layout uses glass-morphism styling, inline SVG pattern for visual richness, and no external assets.

- README.md — this file.

Placeholders
Replace these placeholders in all HTML files when deploying or testing:
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

Notes and constraints followed
- No external images, fonts, or CDNs used. Visual richness comes from CSS gradients and an inline SVG pattern (which may be exported to assets/img/pattern.svg if desired).
- The copy is safety-forward and avoids medical claims. Disclaimers for patch testing, dilution, pregnancy/pets are included.
- The page implements a hybrid offer model and describes how consultations work without making clinical promises.
- Navigation links are present and consistent with other site pages: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html. Nav labels were varied intentionally.
- The contact form posts to {{PRIMARY_CTA_URL}}. Adjust server handling or replace with a third-party form endpoint as needed.

Accessibility & responsiveness
- Simple semantic structure and form labels included.
- The layout adapts for narrow screens via a basic media query.

Developer tips
- To keep a single consistent SVG background across the site, copy the inline <svg> from contact.html to a file at assets/img/pattern.svg and reference it via CSS background-image: url('/assets/img/pattern.svg');
- Replace placeholders before publishing. Consider server-side templating or a build script that injects business values.
- Safety language is intentionally conservative — do not add medical claims when editing blend pages or product descriptions.

Further chunks will contain other pages (index, services, blends, shop, pricing, about, book). The blends page must include 8–12 blends with top/middle/base notes, aroma profiles, and soft "supports" language that avoids clinical assertions.

If you need edits to the contact page structure, microcopy, or layout details (colors, offsets, glass strength), request the change and specify the target viewport or brand tokens to adjust.