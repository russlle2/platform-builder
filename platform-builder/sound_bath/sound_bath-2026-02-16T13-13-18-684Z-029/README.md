Contact page and integration notes for the sound bath site (chunk 4).

Files included:
- contact.html — full contact & booking page with embedded CSS, form and essential content.

Purpose:
- Provides a premium, sensory-first contact hub for inquiries and bookings. Includes "what to bring", session flow, contraindications, instruments, private options, and a clear CTA.

Placeholders to replace dynamically:
- {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{NEXT_EVENT_DATE}}

Notes for implementers:
- The page references /assets/img/pattern.svg for the decorative background. Ensure the project includes a unique SVG file at that path for the site-wide pattern (this chunk does not create the SVG).
- The contact form posts to {{PRIMARY_CTA_URL}}. Wire this to your booking endpoint or serverless function.
- The content emphasizes sensory & premium language and includes safety/contraindications text. Edit medico-legal content as needed for compliance.

Design guidance:
- Keep consistent typographic scale and generous spacing to convey calm and premium feeling.
- Use subtle glass panels, soft gradients and the SVG pattern for visual richness — no external assets or CDNs required.

If you need a companion assets file (SVG pattern) or a different nav variant for another page, request the next chunk.