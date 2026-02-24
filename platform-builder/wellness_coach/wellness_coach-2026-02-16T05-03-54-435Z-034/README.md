# Chunk 4 — Contact page and README

This bundle includes the site contact page (contact.html) tailored for a wellness coach and a README with instructions.

Files included:
- contact.html — A premium, lux_gallery-style contact page that echoes the core site sections (hero, social proof, benefits, process, FAQ, lead magnet, CTA) so the "required section pack" ripples to this page.

Placeholders to replace (appear throughout contact.html):
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

Notes & implementation details:
- The layout follows the "lux_gallery" family: large SVG visuals (referenced as local assets) and restrained motion-friendly, gallery-like sections.
- The copy uses a gentle_therapist voice: compassionate, practical, outcome-focused without medical claims. The VIP Day model is reflected in language (options include VIP Day and terse planning).
- The contact form posts to {{PRIMARY_CTA_URL}}. Replace with your processing endpoint or use a booking link like to a scheduling page.
- Local SVG references (expected to exist in the project):
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg
  Please create unique SVGs for each file (do not use external CDNs or copied shared assets).

Accessibility & privacy:
- Form fields are labeled. The copy emphasizes confidentiality and response times.
- There are no analytics, external fonts, or third-party scripts in this chunk.

Navigation:
- Header links point to the other project pages (index.html, about.html, programs.html, services.html, pricing.html, testimonials.html, book.html). Adjust labels or links as needed.

Customization tips:
- Swap colors in the :root CSS for brand adjustments. The design aims for a calm, premium palette.
- To add micro-interactions, include small, local JS files that progressively enhance forms (not included here).

If you need the other pages or the SVG assets created in this chunk, ask for the next bundle and specify any preferred color palette or illustrative style for the SVGs.