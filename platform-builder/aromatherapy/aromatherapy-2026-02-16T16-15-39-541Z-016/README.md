# Chunk 4 — contact.html & README

This bundle provides the contact page for the aromatherapy web experience and a short README with usage notes.

Files included:

- contact.html — The contact/connect page for {{BUSINESS_NAME}}. Contains:
  - Navigation (subtle labels: Home, Offerings, Blends, Boutique, Plans, About, Book, Connect).
  - A hero/contact form with safety-forward language and required consent checkbox.
  - Sticky contact card (phone, email, call-to-action to book).
  - Quick map placeholder and hours.
  - Inline CSS (no external fonts or CDN) and reference to assets/img/pattern.svg for the repeating decorative background.
  - Minimal client-side form handling to simulate submission.

Notes & placeholders to replace:

- Replace the following placeholders in contact.html (and across the site):
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

- Layout family: clinic_modern
- Voice: mystic_modern
- Offer model: retail_addon
- Slug: aromatherapy-2026-02-16T16-15-39-541Z-016
- Seed: 3551683062

Accessibility & safety:
- The copy keeps aromatherapy consultative and avoids medical claims.
- The form includes a consent checkbox acknowledging consultative guidance.
- Add a visible FAQ page (recommended) covering dilution, patch testing, pets, and pregnancy notes. That content belongs on blends.html or a dedicated FAQ section.

Assets:
- The page references assets/img/pattern.svg for the repeating background pattern. Ensure the SVG exists in assets/img/pattern.svg and is unique across the project (per bundle uniqueness requirement).
- No external images, fonts, or CDNs are used.

Styling & visuals:
- Visual richness is achieved with layered gradients, translucent "glass" cards, and the repeating SVG pattern.
- Colors follow a mystic-lavender accent with deep indigo backgrounds suitable for a calming aromatherapy aesthetic.

Integration tips:
- If using a template engine, substitute placeholders at render time.
- Ensure routes for index.html, services.html, blends.html, shop.html, pricing.html, about.html, and book.html exist and match the links used in the nav.
- For production, hook the contact form to your backend or a third-party form handling service; the current script only simulates a client-side success message.

Design notes for other pages (to keep consistency & uniqueness):
- Keep nav labels varied across templates (this file uses 'Boutique' for shop and 'Offerings' for services).
- The blends page should list 8–12 blends with top/middle/base notes, an aroma profile line, and a supporting statement that is safety-focused (e.g., 'supports restful routines' — avoid medical promises).
- Shop should present static product cards (kits, roll-ons, diffusers) with clear ingredient lists and recommended dilution information.

If you need the companion assets (pattern.svg) or the remaining HTML pages for the site, request the next chunk and specify which files you want next.