Contact page and notes for the sound bath site

Files in this bundle:
- contact.html — Contact page with rotating Proof Gallery (testimonials + credibility badges with tooltips), a micro Pricing Comparator toggle (Monthly vs Series/package) with animated price numbers, an accessible contact form, and a contraindications notice.

Placeholders used (replace before publishing):
- {{BUSINESS_NAME}} — business / program name
- {{TAGLINE}} — short tagline
- {{PHONE}} — phone number, used as tel: link
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — main CTA label used across header and form
- {{PRIMARY_CTA_URL}} — main CTA URL used for quick navigation
- {{CITY}} — city placeholder
- {{STATE}} — state placeholder

Integration notes:
- This chunk is intended as the contact page (contact.html) for the larger site. The header links assume sibling pages at /index.html, /events.html, /private-sessions.html, /pricing.html, /about.html, /faq.html, /book.html.
- The page references a pattern asset at assets/img/pattern.svg in the design brief. If you include that SVG, you can use it as a background in the header or panels.

Daring features implemented locally (no external CDN):
- Proof Gallery: rotates testimonials every 4.5s; has manual prev/next controls; credibility badges reveal tooltips on hover/focus.
- Pricing Comparator: toggle between Monthly and Series/package pricing; prices animate smoothly between values.

Accessibility and safety:
- Contraindications are included as a clear notice. This is not medical advice — modify wording if you bring the site into a clinical setting.
- The badge tooltips are keyboard-focusable.

Styling and assets:
- All styling is embedded in the HTML for portability. No external fonts or assets are required for operation, though adding a custom SVG pattern is recommended for visual richness.

How to test locally:
1. Place contact.html in your site folder alongside the other pages referenced in the header.
2. Replace placeholder tokens with real values.
3. Open contact.html in a browser. Test the testimonial rotation, tooltip hover/focus, and the pricing toggle.

Developer notes:
- The Pricing Comparator expects price values set as data-monthly and data-package on elements with class="price". These are integers (dollars) and will be formatted to USD during animation.
- Testimonials are defined inline in the script; for CMS integration, replace the array with dynamic data.

Version / metadata:
- slug: sound_bath-MORE-2026-02-17T09-32-35-495Z-004
- seed: 3537368528
- layoutFamily: poster_hero
- voiceFamily: clinical_calm
- offerModel: membership
- sections included in this chunk: contact

EOF