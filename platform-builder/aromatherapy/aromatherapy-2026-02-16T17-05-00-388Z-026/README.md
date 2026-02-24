This chunk (slug: aromatherapy-2026-02-16T17-05-00-388Z-026) includes two files for the contact page of a mystic_modern aromatherapy site (layoutFamily: lux_gallery, offerModel: retail_addon).

Files included:
- contact.html — Full contact page containing the required sections in this pack: hero, diagnostic, plan, micro_habits, pricing, cta. Uses placeholders for site variables: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{FAVORITE_BLEND}}.

  Notes:
  - Safety-first language is present (no medical claims). FAQs cover dilution, patch test, pets, and pregnancy guidance.
  - The layout uses only CSS and inline SVG for visual richness; it references assets/img/pattern.svg as a decorative background (ensure that file is provided elsewhere in the bundle).
  - Form posts to {{PRIMARY_CTA_URL}} and includes minimal client validation and a safety confirmation when certain keywords are present.

- README.md — This file (you are reading it).

Usage:
- Place these files into the site root. Ensure the rest of the site pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) and the asset SVG (assets/img/pattern.svg) are present in other chunks.
- Replace placeholders with actual business values during build or templating.

Accessibility & safety:
- Simple semantic structure, clear labels, and conservative aromatherapy guidance. No medical treatment claims.

Design intent:
- Mystic modern voice with a luxurious gallery aesthetic. Visuals rely on gradients, subtle SVG shapes, and a repeating pattern SVG.

If you are assembling the full site, ensure the unique SVG pattern is included at assets/img/pattern.svg and that other pages vary headings and section ordering to meet uniqueness requirements.