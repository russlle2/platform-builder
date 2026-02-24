Project: wellness_coach (slug: wellness_coach-2026-02-16T05-11-08-413Z-036)

This bundle contains two files for chunk 4 of the site build:

- contact.html — The contact/connection page designed in the "zen_minimal" layout family with the "gentle_therapist" voice. It intentionally echoes the site-wide section pack (hero, social_proof, benefits, process, faq, lead_magnet, cta) so those elements ripple from the index to this page.
- README.md — This file (you are reading it).

Placeholders (replace these before publishing):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{COACH_NAME}}
- {{CREDENTIALS}}
- {{CITY}}
- {{STATE}}

Design notes:
- Layout: zen_minimal — generous whitespace, subdued palette, subtle shadows and soft radii for a premium, calm feel.
- Voice: gentle_therapist — supportive, non-pressuring language that focuses on sustainable habits and client outcomes (no medical claims).
- Navigation labels are intentionally varied (e.g., "Paths" and "Rates") to meet uniqueness requirements; links point to the canonical files for the site structure.
- The contact page includes a contact form that sends GET to /book.html to keep flows local and simple. The lead magnet form is client-side only (simulated) and does not submit to external services.

Assets referenced (expected in assets/img/):
- hero.svg — unique hero illustration (used in hero section)
- avatar.svg — small avatar/logo used in header
- pattern.svg — (used elsewhere across site; referenced by other pages)

Implementation guidelines:
- Keep SVG assets local in assets/img/ and do not use external CDNs or fonts.
- Replace placeholders with real values. Ensure PHONE is in tel: friendly format if used for direct links.
- Privacy and legal pages should be added (e.g., privacy.html) before production if you collect emails.

Accessibility & behavior:
- Hero and decorative images include alt text and role hints.
- Forms include basic required attributes; the lead magnet UI uses a lightweight client-side handler (no third-party tracking).

Further customization:
- Tweak color tokens in the style block to match brand colors.
- If you add analytics or form integrations, host them server-side or use privacy-first implementations.

Chunk rules reminder:
- This chunk includes only contact.html and README.md. Other pages and assets are part of other chunks in the full build.

If you want, I can:
- Provide the missing SVG files (hero.svg, avatar.svg, pattern.svg) crafted to match this layout.
- Generate the remaining templates (index, about, programs, services, pricing, testimonials, book) ensuring every page maintains uniqueness and the required section pack ripple.

End of README.