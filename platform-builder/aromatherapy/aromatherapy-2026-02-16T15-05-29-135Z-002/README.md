Contact page for the aromatherapy template (chunk 4)

Files included:
- contact.html — full static contact page designed for an aromatherapy practitioner. Includes hero, social proof, benefits, process, FAQ, lead magnet, and CTA sections as required.

Notes for developers:
- Placeholders to replace before publishing:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}
  - {{PRACTITIONER_NAME}}
  - {{FAVORITE_BLEND}} (not used on this page but available globally)

- Navigation labels are intentionally varied from other templates: Home, Offerings, Blends, Market, Fees, Meet, Reserve, Get in Touch.
- The decorative SVG pattern is embedded inline to avoid external assets and to ensure visual richness via SVG + gradients. If you prefer a separate file, extract the <svg> from the page and save it as assets/img/pattern.svg then update the markup to reference it.

Accessibility & safety:
- All consumer-facing copy is safety-forward and avoids medical claims. The FAQ covers dilution, patch-test, pets, and pregnancy.
- Form handling is intentionally minimal for a static build. Integrate with a form backend or service (Netlify Forms, Formspree, or your server) and remove the demo JS alerts.

Styling:
- Uses CSS variables and a responsive layout. No external fonts or CDN dependencies.

Deployment tips:
- Replace placeholders programmatically or via your templating pipeline.
- For production email handling, wire the form to an endpoint and implement server-side validation and anti-spam protection.

Design rationale:
- The page emphasizes practical guidance and trust-building while keeping a warm, approachable tone suitable for a practitioner offering VIP day services.

If you need the standalone SVG file exported or a matching assets/img/pattern.svg created, request it and include the desired filename and path.