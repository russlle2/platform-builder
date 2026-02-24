Chunk 4 — Contact page and notes for the Aromatherapy Practitioner site (layoutFamily: lux_gallery, voice: clinical_calm)

Files included:
- contact.html — Contact/connect page with form, safety-forward FAQ, myths clarification, practice pillars, case-notes preview, and CTA.

Placeholders used (must be replaced during build or runtime):
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

Design & implementation notes:
- No external fonts or CDNs; all styling is inline via a compact stylesheet.
- Visual richness is achieved with a subtle gradient background and an external SVG pattern referenced at assets/img/pattern.svg. Ensure a unique pattern.svg is created in that path for full effect.
- Form is non-functional (action="#"). The onsubmit handler shows an alert; integrate your backend endpoint or service to handle submissions and to send mail to {{EMAIL}}.
- Accessibility: simple semantic markup, aria labels, and responsive layout.

Aromatherapy & safety considerations included:
- Prominent safety-first language; disclaimers about pregnancy, pets, and medical conditions.
- FAQ covers dilution, patch testing, pregnancy/nursing, and pets.
- Case notes are explicitly de-identified and educational; no clinical claims are made.

Developer guidance:
- Create assets/img/pattern.svg as a unique tiled SVG pattern to match the site look.
- Hook up the contact form to your chosen backend (server endpoint, Netlify Functions, or form service). Keep the hidden honeypot input (address_2) to reduce spam.
- Replace placeholders at build time or server-side rendering.

Content decisions:
- Navigation labels intentionally vary from other pages (e.g., "Start", "Reserve", "Connect") to satisfy uniqueness requirements.
- Headings and section order differ from other templates in the project to avoid repetition.

If you need the complementary pages (index, blends, shop, etc.) or the actual SVG pattern file, request the next chunk and include a seed if you want deterministic variants.