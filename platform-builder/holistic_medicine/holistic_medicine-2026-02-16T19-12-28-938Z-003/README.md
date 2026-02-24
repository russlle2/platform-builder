This chunk includes the contact page and usage notes for the holistic/integrative medicine site.

Files included:
- contact.html — a standalone, playful-premium contact page designed for the "split_diagonal" layout family and the "intensive" offer model. It includes: hero, story, offers, pricing teaser, testimonials, and a contact form (the required section pack). The page uses an inline SVG pattern for visual texture and a diagonal split between content and form.

Placeholders (must be replaced during build or templating):
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

Integration notes:
- The page is intentionally self-contained with inline styles and an embedded SVG pattern. No external assets or CDNs are required.
- Navigation links point to: index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html. Adjust labels or paths if your build system uses different routes.
- The contact form posts to {{PRIMARY_CTA_URL}}. For demos the form uses a client-side handler that shows an alert and optionally redirects to PRIMARY_CTA_URL. Replace with your server endpoint or form service.

Holistic practice considerations:
- The copy avoids promises of cures and frames testing and plans as educational and individualized. Keep that tone when translating other pages.
- If you create the conditions and approach pages, include the required content: common concerns (stress, sleep, digestion, inflammation, energy) with disclaimers, and an approach page that describes intake, planning, follow-ups, and optional labs as education.

Styling and assets:
- The page embeds a unique SVG pattern within the HTML. If you prefer a separate asset, extract the <svg> element and save as assets/img/pattern.svg, then update the markup or CSS to reference it.

Accessibility and UX:
- Form fields are labeled and basic validation is performed. Update server-side handling before production use.
- Keep the privacy/disclaimer text visible where contact or intake happens.

If you need alternate layout variants, localized wording, or a static SVG file generated for assets/img/pattern.svg, tell me which preferences and I will produce them in the next chunk.