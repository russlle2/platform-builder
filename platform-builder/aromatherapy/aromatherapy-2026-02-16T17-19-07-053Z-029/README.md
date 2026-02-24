Contact page for the aromatherapy site (glass_morphism, practical_guide voice)

What this file includes:
- contact.html: a safety-first contact and conversion page with hero, contact form, social proof, quick process, FAQ, lead magnet, and CTA.

Placeholders to replace (keep the double-curly format):
- {{BUSINESS_NAME}}  - business or brand name
- {{TAGLINE}}        - short tagline
- {{PHONE}}          - contact phone number
- {{EMAIL}}          - contact email address
- {{PRIMARY_CTA_LABEL}} - primary call-to-action label (eg. "Book now")
- {{PRIMARY_CTA_URL}}   - primary CTA url (eg. 'book.html')
- {{CITY}}           - city for footer
- {{STATE}}          - state for footer
- {{PRACTITIONER_NAME}} - practitioner's full name
- {{FAVORITE_BLEND}} - optional friendly note

Design notes / developer guidance:
- Uses a repeating SVG at assets/img/pattern.svg for the subtle background pattern. Include a unique pattern at that path in your assets.
- Visual style follows glass-morphism: translucent panels, backdrop-filter blur, soft gradients.
- No external fonts or CDNs are referenced. Use system fonts for portability.
- The contact form is static and submits to mailto:{{EMAIL}} by default. For production, wire it to a server endpoint or form provider.
- The lead magnet form is mocked client-side (no backend); replace captureMagnet with real integration for email capture.

Accessibility & content:
- The page is safety-focused: disclaimers are included and it avoids medical claims.
- FAQ covers dilution, patch testing, pet safety, and pregnancy considerations.

Integration:
- Ensure navigation links match the other pages in the project (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html).
- Offer model: this template highlights a VIP day option; update booking links and pricing pages to reflect availability.

Notes for other chunks:
- This chunk intentionally references assets/img/pattern.svg. Provide a unique SVG there to keep each page visually distinct.
- Keep headings and section order varied across templates to maintain uniqueness across the site.

License: Replace placeholder content responsibly. This file is a static HTML template intended for adaptation.
