# Contact Page — aromatherapy-2026-02-16T17-09-45-459Z-027

This chunk contains the contact page and a README for the aromatherapy practice site.

Files included in this bundle:
- contact.html — The contact/connect page for {{BUSINESS_NAME}}. Contains a responsive contact form, hours, map placeholder, FAQ focused on aromatherapy safety (dilution, patch testing, pets, pregnancy), and a prominent call to action.

Placeholders to replace in your build system or templating engine:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}} (not used on this page but present in site-wide templates)

Design notes:
- Layout family: clinic_modern — clean, rounded cards, soft gradients.
- Voice family: mystic_modern — calm, intentional copy without medical claims.
- Offer model: retail_addon — contact page links to retail and booking flows.
- Visuals are produced with CSS gradients and an inline SVG placeholder. The page references an external SVG pattern at `/assets/img/pattern.svg` for a subtle background overlay. Ensure that file exists in the assets folder when deploying.

Accessibility & safety:
- All copy avoids medical claims and encourages consulting qualified professionals when needed.
- The FAQ includes safety-forward guidance: dilution, patch testing, pets, pregnancy/lactation.
- Form requires an email and gently prompts users to include sensitivity information.

Integration tips:
- Replace placeholder strings at build time (static site generator, server-side templates, or a simple replacement script).
- If you want an embedded map, swap the decorative SVG in the `.map` element with an iframe or interactive map embed.
- For server-side form handling, set the `<form action>` to your endpoint and secure submissions with CSRF tokens where applicable.
- Ensure `/assets/img/pattern.svg` contains the unique SVG background referenced in site styles to preserve the intended visual texture.

Customization ideas:
- Add microcopy about lead times for custom blends or retail shipping info.
- Provide a link to the full FAQ page (if separate) for more in-depth safety resources.
- Hook the submit button to an email service API or CRM for automated intake.

Notes for developers:
- No external fonts or CDNs are used; the page relies on system fonts for performance and privacy.
- CSS variables at the top of the document allow quick theming changes (accent colors, radii, shadows).

If you need alternate nav labels, localized variants, or an embedded booking widget for the Reserve/Book flow, request the specific integration and it can be added while preserving safety-forward language.
