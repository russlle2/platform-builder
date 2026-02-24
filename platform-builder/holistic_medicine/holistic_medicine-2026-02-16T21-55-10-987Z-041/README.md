Project: holistic_medicine (slug: holistic_medicine-2026-02-16T21-55-10-987Z-041)

Layout family: zen_minimal
Voice: minimal_poetic
Offer model: events_series

Files in this chunk:
- contact.html  (site contact page, hero, form, info, FAQ, newsletter)
- README.md    (this file)

Placeholders to replace in deployment:
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

Notes & guidance:
- This contact page follows the project’s gentle, educational tone: no guarantees, emphasis on collaboration and learning.
- The page references an SVG background at assets/img/pattern.svg for decorative patterning. Add a unique SVG there (ensure it’s permitted by hosting) to preserve visual richness.
- Navigation labels were chosen to be distinct from other templates in the set ("Our Way", "Offerings", "Home", etc.).
- Forms post to {{PRIMARY_CTA_URL}} by default; adjust the action to your preferred endpoint or serverless function.
- The site is deliberately minimal and CSS-driven; no external fonts or CDNs are used.

Accessibility & privacy:
- Forms are basic HTML for progressive enhancement; a small script adds friendly UX but preserves native behavior if JS is disabled.
- No tracking or third-party scripts are included.

Customization tips:
- Replace placeholders programmatically (build script or templating system) before publishing.
- Tune color variables in the <style> block to match brand palette while keeping soft gradients for the zen_minimal aesthetic.
- Ensure the events_series offerings are linked from the primary CTA ({{PRIMARY_CTA_URL}}) and that workshop pages include clear educational disclaimers.

Holistic medicine content rules reminder:
- Avoid language promising cures.
- Focus on education, whole-person assessment, lifestyle, optional labs as educational tools, and collaborative planning.
- Conditions and outcomes should be presented with nuance in relevant pages (services, conditions, approach).

Pages expected in the full site (not all provided in this chunk): index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html

If you need an assets/img/pattern.svg created to match this layout family, request a follow-up and include desired motif (organic grid, wave, leaf lattice).