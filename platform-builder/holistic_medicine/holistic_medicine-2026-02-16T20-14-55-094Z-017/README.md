Chunk: holistic_medicine-2026-02-16T20-14-55-094Z-017 (layoutFamily: aura_editorial)

Files included in this bundle (chunk 4):
- contact.html  — Contact & outreach page with full section pack (hero, social_proof, benefits, process, faq, lead_magnet, cta).

Notes and conventions:
- Placeholders left for templating: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{CREDENTIALS}}.
- Visuals: background uses CSS gradients and an embedded SVG pattern (data URI). No external images, fonts, or CDNs are referenced.
- Tone/voice: playful_premium with clear educational framing; avoids promises or guaranteed cures per content rules.
- Contact form submits to {{PRIMARY_CTA_URL}}. Secondary actions include mailto: and tel: links.

Accessibility & responsive notes:
- Uses semantic elements (header, main, footer, section, details) and accessible labels for form controls.
- Layout is responsive: two-column grid collapses on narrow screens.

Holistic medicine rules observed:
- No guaranteed cures; language emphasizes education, whole-person assessment, and collaborative planning.
- The contact page includes clear wording on new-patient intensives and optional labs; other site pages should contain condition-specific content with disclaimers per project rules.

Development:
- This chunk intentionally does not create external assets (SVG file at assets/img/pattern.svg) due to chunk constraints; the page embeds its own SVG pattern inline for visual richness. If a shared pattern file is provided by another chunk, pages may be adjusted to reference it.

If you need a variant with the external assets/img/pattern.svg file created here, request the next chunk to include assets.