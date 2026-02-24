Chunk 4: contact.html

Files included:
- contact.html — full page for the Contact / Reach Us experience for the holistic medicine site.

Notes for maintainers:
- This HTML uses inline CSS and an embedded SVG pattern (no external assets) to meet the visual richness requirement.
- Placeholders to replace in templates:
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
- The contact form progressively attempts a POST to {{PRIMARY_CTA_URL}} and falls back to a friendly confirmation if the endpoint is not configured.
- The lead magnet triggers a client-side download of a simple guide (replace with a real asset delivery workflow in production).

Content guidance (holistic medicine rules observed):
- The page emphasizes education, shared decision-making, and whole-person care. It avoids any guarantee of cures.
- For other pages (conditions, approach), ensure disclaimers and educational tone are preserved.

Customization:
- Swap text, adjust colors in :root, or replace the inline SVG with a separate asset if needed. If moving the SVG to assets/img/pattern.svg, update the HTML to reference it and remove the inline block.

End of chunk 4.