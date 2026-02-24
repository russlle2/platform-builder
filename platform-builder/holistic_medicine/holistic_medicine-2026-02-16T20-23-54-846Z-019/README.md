Chunk 4 — contact page and usage notes

This chunk provides two files:

- contact.html — A responsive, zen-minimal contact page for the holistic/integrative medicine site.
- README.md — This file (usage notes).

Design intent and features:
- Layout family: zen_minimal (clean spacing, soft radii, calm gradients).
- Voice: playful_premium — measured, warm, lightly playful language suitable for premium holistic care.
- Offer model: intensive — emphasizes multi-stage intakes and education-focused visits.
- Visual richness: CSS gradients + an embedded SVG pattern via data URI (no external assets or CDNs).
- Contact page includes: contact form (mailto: fallback), practitioner & practice details, hours, short FAQ, a map placeholder, and an obvious primary CTA linking to {{PRIMARY_CTA_URL}}.

Placeholders to replace during build or runtime:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Accessibility & disclaimers:
- The page explicitly avoids claims of cures and stresses education, shared decision-making, and that messages are not a substitute for emergency care.
- Form uses mailto: content for simple static deployments. For production, swap the form action for a server endpoint or form service.

Notes for integrators:
- Navigation labels intentionally vary from other templates (e.g., "Welcome", "Offerings", "Concerns", "Philosophy", "Invest", "Our Story", "Reserve", "Connect") — keep links pointing to the canonical files (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html).
- The page references no external fonts; it uses system fonts for performance and consistency.
- If you want a standalone assets SVG (assets/img/pattern.svg), you may extract the small pattern encoded in the CSS background of the hero and create that file for reuse, but the contact page is intentionally self-contained.

Styling and structure are intentionally simple so the rest of the site (index, services, etc.) can adopt the same visual system while offering unique copy and section orders.

End of chunk 4.