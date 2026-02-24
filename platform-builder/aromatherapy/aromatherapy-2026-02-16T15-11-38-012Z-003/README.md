# Aromatherapy Site — chunk 4 (contact)

This bundle contains the contact page and README for the aromatherapy practice template.

Files included:
- contact.html — full contact page with required sections: hero, ritual, what_to_expect, schedule, pricing, faq, cta (contact form). Uses glass_morphism styling and clinical_calm voice.

Placeholders to replace in templates:
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
- Layout family: glass_morphism — frosted panels, soft gradients, rounded cards.
- Voice family: clinical_calm — measured, safety-forward, non-medical.
- Offer model: hybrid — mix of remote and in-person guidance implied.
- Navigation labels intentionally varied (e.g., Offerings, Investment, Connect) while links point to the canonical pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html).

Accessibility & safety:
- Form fields are labeled; aria attributes used for landmark sections.
- Copy avoids medical claims; FAQ covers dilution, patch tests, pets, and pregnancy.

Interactions:
- Inline SVG pattern provides visual texture (no external assets required).
- Minimal JavaScript: form validation (demo), quick-book buttons that redirect to book.html with a slot query param.

How to use:
1. Replace placeholders with real values.
2. Ensure other site pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) are generated in their respective chunks.
3. Optionally adjust schedule times, pricing, and FAQ to match practitioner policies.

Notes for developers:
- The blends and shop pages (other chunks) must adhere to aromatherapy content rules: no medical claims, blends 8–12 with top/middle/base notes and supportive statements; shop page static product cards.
- There should be an assets/img/pattern.svg in the overall project to accompany the inline SVG pattern; however, this contact page contains a standalone SVG to ensure unique visuals if the asset is missing.

License: Provided as UI template; ensure any clinical advice used on the site is consistent with local regulations and professional scope of practice.