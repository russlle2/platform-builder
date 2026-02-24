{{BUSINESS_NAME}} — Static site bundle

Overview:
This small static site is designed for an aromatherapy practitioner offering consultations, custom blends, and a focused "VIP Day" offer. The visual style is clinic_modern: calm, spacious layouts with soft gradients, a gentle herb-inspired palette, and a clean, accessible UI. The voice is practical_guide — direct, safety-focused, and service-oriented.

Included pages (site-wide expectations):
- index.html  (landing, hero, ritual, what_to_expect, schedule, pricing, faq, cta)
- services.html
- blends.html  (8–12 blends with top/mid/base notes, aroma profile, "supports" statement)
- shop.html    (product cards: kits, roll-ons, diffusers)
- pricing.html
- about.html
- book.html
- contact.html  (this file)

This chunk contains:
- contact.html — contact page and message form; VIP Day call-to-action; inline decorative SVG pattern; safety-first copy; placeholders.
- README.md — this file describing the site and notes.

Placeholders to replace
- {{BUSINESS_NAME}} — your clinic or practice name
- {{TAGLINE}} — short descriptor used elsewhere (not in this chunk)
- {{PHONE}} — primary contact phone
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — CTA button text (e.g., "Send inquiry")
- {{PRIMARY_CTA_URL}} — booking link (used across site)
- {{CITY}} / {{STATE}} — location
- {{PRACTITIONER_NAME}} — practitioner's name
- {{FAVORITE_BLEND}} — used on blends or personalized sections

Design notes & accessibility
- Color & contrast: palette favors a muted green and deep teal. Ensure contrast ratios meet WCAG AA for body text on production changes.
- Typography: system stack used for performance and legibility. Replace with licensed fonts if desired.
- Forms: client-side validation is minimal. Integrate with your preferred backend or form service; include CSRF and spam protections.
- SVG pattern: decorative and low-contrast; hidden from assistive tech via aria-hidden.

Aromatherapy & safety guidance
- Content avoids medical treatment claims. Language is supportive, educational, and non-diagnostic.
- Always prompt users to disclose pregnancy, breastfeeding, young children, pets, and known sensitivities early in intake flows.
- All blend descriptions (on blends.html) must include dilution guidance and patch-test instructions.
- FAQ (on index or dedicated FAQ page) should cover dilution ratios, how to patch test, pet safety, and pregnancy precautions.

Development & deployment
- Static site: files can be served by any static host (Netlify, Vercel, GitHub Pages).
- To integrate forms: hook form action to server endpoint, Netlify Forms, or a third-party form processor. Ensure to update the form action and add hidden inputs required by the provider.

Extending the site
- blends.html should list 8–12 curated blends. Each blend entry: title, top/middle/base notes, aroma profile (e.g., fresh, warm, resinous), and a short "supports" line (non-medical: supports calm, supports alertness, supports restful routines).
- shop.html should contain product cards for kits, roll-ons, and diffusers — include clear ingredient lists and safety info.
- Add assets/img/pattern.svg for a reusable site background pattern; the contact page uses an inline decorative SVG but a shared asset ensures consistency.

Support
- For front-end edits, update HTML/CSS directly. Keep components responsive and test on mobile.
- For copy updates, maintain safety-first tone and avoid therapeutic claims.

License & credits
- This bundle is a starting point. Replace placeholder copy and assets with your own intellectual property.

Thank you — please replace the placeholders before publishing.