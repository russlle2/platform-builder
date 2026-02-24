Project: {{BUSINESS_NAME}} — Wellness Coach Site (aura_editorial)

Overview:
This repository contains a small editorial website template tailored for a wellness coach. The design uses a bold editorial aesthetic (aura_editorial) with high-contrast palettes and a strong typographic scale. It emphasizes outcomes, practical habit systems, and non-medical coaching philosophy.

Files in this chunk:
- contact.html — Contact and lead-capture page with hero, myth_vs_truth, pillars, case_studies, faq, and CTA sections.

Other pages expected in the full bundle (must exist at root):
- index.html
- about.html
- services.html
- programs.html
- pricing.html
- testimonials.html
- book.html
- contact.html (this file)

Local assets (must exist in assets/img/):
- hero.svg  (unique SVG for hero art)
- avatar.svg  (unique avatar / logo mark)
- pattern.svg (unique decorative pattern)

Placeholders to replace:
- {{BUSINESS_NAME}} — your practice or brand name
- {{TAGLINE}} — short strapline
- {{PHONE}} — primary phone number (include country code as needed)
- {{EMAIL}} — primary contact email
- {{PRIMARY_CTA_LABEL}} — main call-to-action text (e.g., "Work with me")
- {{PRIMARY_CTA_URL}} — href for primary CTA (e.g., "book.html")
- {{COACH_NAME}} — coach's full name
- {{CREDENTIALS}} — credentials string (e.g., "MSc, PCC")
- {{CITY}} and {{STATE}} — locality for footer and contextual mentions

How to use:
1. Replace placeholders with site-specific values (basic find-and-replace across files).
2. Ensure the assets listed above are present in assets/img/ and are unique SVGs per template rules.
3. Open index.html in a browser to preview locally. No build step is required — files are static HTML/CSS.

Notes & guidelines for content:
- Focus copy on habit systems, frameworks, and measurable outcomes. Avoid medical claims.
- Keep CTAs clear and specific (book, download workbook, schedule discovery call).
- The contact form in contact.html posts to /submit; replace with your form handling endpoint or integrate with a serverless function.

Accessibility & performance:
- All images are local SVGs; optimize SVGs for size and accessibility (include meaningful <title> or role attributes if needed).
- The layout uses simple responsive CSS without external fonts or scripts.

Design customization:
- To dial down the editorial contrast, adjust CSS variables at the top of contact.html (e.g., --bg, --card, --accent).
- For a lighter aesthetic, change background gradients and card colors.

Support:
If you need customization for a different layoutFamily (clinic_modern, earthy_warm, bold_playful, zen_minimal, lux_gallery) or to wire up a real booking backend, provide the desired scope and I can produce updated templates and integration snippets.