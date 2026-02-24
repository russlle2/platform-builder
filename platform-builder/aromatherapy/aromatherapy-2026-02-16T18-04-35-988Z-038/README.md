Contact page and notes for {{BUSINESS_NAME}} site

This bundle chunk contains two files:

- contact.html — a responsive, accessibility-minded contact page tailored for an aromatherapy practitioner. It uses a calm gradient, subtle SVG pattern, and a safety-first message set. The form posts to {{PRIMARY_CTA_URL}} and includes consent fields and prompts about allergies, pregnancy, and pets.

- README.md — this file.

Design & structure highlights:
- Layout: zen_minimal with airy spacing, softened corners, and a two-column hero that collapses on narrow screens.
- Voice: minimal_poetic — concise, gentle, safety-forward language.
- Navigation: labels varied to keep site copy fresh across pages (Home, Offerings, Blends, Store, Rates).
- Safety copy: patch testing, dilution, pregnancy, and pets guidance included in the contact page; explicit legal note that aromatherapy is not medical care.
- Visuals: decorative SVG pattern is embedded inline for immediate rendering. The site expects a unique decorative asset at assets/img/pattern.svg to be included elsewhere in the full bundle for reuse.

Placeholders to replace:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}} (not used on this page but present site-wide)

Accessibility notes:
- Form fields have labels.
- Color contrast kept high for text; decorative graphics are aria-hidden where appropriate.

Integration:
- Form posts to {{PRIMARY_CTA_URL}}; if using a serverless endpoint or third-party form provider, set that URL accordingly.
- Ensure the assets/img/pattern.svg provided in another chunk is present for consistent branding across pages.

Legal & safety:
- The page intentionally avoids clinical or medical claims. Replacements should preserve safety-first wording.

If you need an alternate tone or a shorter contact card for a popup/modal, request a variant and note the desired length and voice.