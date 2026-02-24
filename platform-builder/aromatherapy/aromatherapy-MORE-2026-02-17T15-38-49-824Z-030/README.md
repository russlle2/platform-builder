Contact page for the aromatherapy clinic_modern template (chunk 4).

Files in this chunk:
- contact.html — Complete contact + interactive features.

Purpose:
- Provides a contact hub with an aroma wheel (interactive top/middle/base notes), a rotating proof gallery (testimonials) and credibility badges with accessible tooltips.
- Includes a safety-forward FAQ and explicit notes about dilution, patch testing, pets, and pregnancy.
- Uses placeholders for site-wide values that must be replaced by the site generator: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Interactive features (implemented in contact.html):
- Aroma wheel: three interactive sectors (top, middle, base). Hover or focus to reveal note title + description; click to pin a selection.
- Proof gallery: rotates testimonial quotes every 5 seconds; badges include tooltips that appear on hover and focus for keyboard accessibility.
- Contact form: collects basic intake info and includes a safety consent. Submissions call a local handler (handleSubmit) which currently logs and acknowledges; replace with real endpoint integration as needed.

Assets:
- The layout references assets/img/pattern.svg for a low-opacity background pattern. Provide a unique SVG file at that path for full visual effect. No external fonts or CDNs are used.

Accessibility & Safety:
- Interactive controls are keyboard-focusable and include aria labels. Tooltip text is available on focus.
- FAQ emphasizes non-medical language; all support phrasing uses "may support" framing and includes instructions about patch testing, dilution, pets, and pregnancy.

Notes for integration:
- Update placeholder tokens before publishing.
- Replace the form handler with server-side processing or endpoint integration.
- Provide the required SVG at assets/img/pattern.svg; the visual style anticipates a subtle repeating motif.

Design voice: mystic_modern — modern clinical layout with gentle, grounded metaphors. Offer model: intensive.