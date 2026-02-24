# aromatherapy-2026-02-16T18-32-34-070Z-044 — Contact page chunk

This bundle contains the contact page and a short README for the Aromatherapy Practitioner site.

Files included:
- contact.html — a complete, responsive contact page with a playful-premium voice and earthy-warm styling.

Placeholders to replace (case-sensitive):
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

Design notes:
- Layout family: earthy_warm. Colors use warm creams, chestnut and terra accents.
- Voice: playful_premium — friendly, confident, and safety-focused.
- The page includes required sections (hero, social proof/testimonials, benefits/quick practicals, process/booking form, FAQ, lead magnet, CTA) while keeping the navigation labels unique for this template ("Connect" for the contact link).
- Visual texture uses an external SVG pattern at ./assets/img/pattern.svg (unique pattern file should be added to assets/img/pattern.svg elsewhere in the project). The page also uses gradients and rounded card surfaces — no external fonts or CDNs.

Accessibility & behavior:
- Form fields are labeled and required where appropriate.
- A gentle client-side handler provides immediate confirmation; replace with a server endpoint or form service by changing the form action.
- All aromatherapy copy is safety-forward and avoids medical claims. The page includes clear directions to consult a licensed healthcare provider for medical concerns.

Developer hints:
- To wire up booking, set PRIMARY_CTA_URL to your booking endpoint (or a form handler).
- Swap the SVG pattern at assets/img/pattern.svg with a bespoke SVG to change the background texture — the CSS references the file at ./assets/img/pattern.svg.
- Ensure consistent placeholder replacement across other pages for a cohesive site.

License: internal project snippet for site generation. Replace placeholders and integrate with the rest of the site pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html).

Have fun! Keep it safe and scent-savvy.