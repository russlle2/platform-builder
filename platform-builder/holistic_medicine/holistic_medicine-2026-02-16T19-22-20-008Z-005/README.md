Chunk 4 — contact.html

Files included in this bundle:
- contact.html — the contact/Reach page for the holistic medicine site.

Purpose & notes:
- This chunk provides the contact page layout designed for a split-diagonal aesthetic.
- The page is intentionally warm, conversational, and emphasizes education and whole-person support (no guaranteed cures or medical promises).
- Membership options are presented as an ongoing supportive model; the primary CTA and URL are placeholders: {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}.
- The page references an SVG background pattern at assets/img/pattern.svg. The actual SVG asset is handled in another chunk; the CSS uses it as a repeating overlay for visual texture.

Placeholders to replace in your build pipeline:
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

Accessibility & behavior:
- The form includes client-side checks for name and email and a mailto fallback link.
- Clear, readable contrast and responsive behavior are provided in CSS (grid collapses on small screens).

Integration tips:
- Provide the assets/img/pattern.svg file (unique SVG pattern) in the assets folder for the textured background.
- Hook the form action ({{PRIMARY_CTA_URL}}) to your form handling or membership signup endpoint.
- Ensure server-side validation of form inputs and privacy handling consistent with local regulations.

Voice & design intent:
- Warm storyteller tone with a gentle call to conversation rather than promises of cure.
- Visual richness via gradients, subtle shadows, and a repeating SVG pattern—no external fonts or CDNs used.

End of chunk 4.