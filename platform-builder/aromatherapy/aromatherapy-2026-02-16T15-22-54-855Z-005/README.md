Chunk 4 — contact.html

What this contains:
- contact.html: A complete contact / booking page built for the clinic_modern layout and practical_guide voice. It includes the required sections: hero, social_proof, benefits, process, faq, lead_magnet, and cta. The page emphasizes safety-forward aromatherapy guidance and VIP Day offering.

How to use:
1. Drop contact.html into your site root alongside the other pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html).
2. Ensure the global asset "assets/img/pattern.svg" is present (unique SVG background pattern is required by the project). The page references it as a background image.
3. Replace placeholders with real values before publishing:
   - {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{FAVORITE_BLEND}}
4. Replace demo form handlers and alert() calls with real endpoints (the form currently prevents submission and shows demo alerts).

Accessibility & safety notes:
- Forms include labels and aria attributes for basic accessibility. Customize further for your needs.
- Content follows aromatherapy safety guidance: no medical claims, includes info on dilution, patch tests, pets, and pregnancy. Keep all client-facing copy conservative and include referral language for medical concerns.

Integration tips:
- Keep nav labels in contact.html intentionally different from other templates (e.g., "Connect" vs "Contact") to meet uniqueness requirements.
- The contact panel is designed to be functional without external JS; enhance with your booking system or analytics as needed.

If you need the matching SVG pattern or other pages from the bundle, request the asset chunk or the remaining HTML files.