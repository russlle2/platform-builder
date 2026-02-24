# Contact Page — holistic_medicine (chunk 4)

This bundle contains the contact page and a small README for the holistic/integrative medicine site.

Files included:
- contact.html — a responsive, playful-premium contact page designed for a zen_minimal layout. Contains an accessible contact form, hero copy, meta contact quick-links, and a subtle SVG pattern background. Uses only CSS + inline SVG for visual richness.

Placeholders to replace before publishing:
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

Notes and integration guidance:
- The form posts to {{PRIMARY_CTA_URL}}; replace with your form handling endpoint or integrate with serverless submission logic. The current client-side script simulates submission for demo purposes.
- Visuals are generated with CSS gradients and an inline SVG pattern (no external assets or CDNs required). If you supply an assets/img/pattern.svg in another chunk, it can be used instead — but this page works standalone.
- Copy intentionally avoids any language promising cures. The microcopy highlights education, collaboration, and realistic timelines.
- Nav labels are intentionally varied (e.g., "Offerings", "Concerns", "Method", "Investment", "Who", "Schedule", "Reach") to satisfy subtle variation requirements.
- Accessibility: form fields have labels; responsive layout stacks on small viewports. Further ARIA enhancements can be added depending on your CMS.

Design intent:
- Voice: playful_premium — warm, confident, and a touch whimsical while maintaining professional clarity.
- Layout family: zen_minimal — generous negative space, soft radii, calm green accents for a healing palette.
- Offer model: intensive — messaging supports longer intake conversations and follow-up planning rather than quick fixes.

License & attribution:
- Build freely into your static site generator or drop directly into a web root. No external dependencies.

If you need an alternate variation (plain form-only, multi-step intake, or translations), ask and I’ll produce an additional page.
