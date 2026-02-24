# Chunk 4 — contact.html + README

This bundle contains two files for the wellness coach site variant (layoutFamily=clinic_modern, voiceFamily=warm_storyteller). Files included in this chunk:

- contact.html — The contact + interactive mapping page.
- README.md — This description and usage notes.

Features implemented in contact.html
- Contact form with local demo submission (no server required).
- Progress meter: select up to 3 goals; click "Map My 30 Days" to render a 30-day path map. The map creates a 30-node visual, highlights weekly milestones (days 7,14,21,30) and offers small habit suggestions tied to chosen goals.
- Proof gallery: rotating testimonials (client quotes) and a set of credibility badges. Badges reveal details via tooltips on hover.
- Local-only JS and CSS (no external dependencies, no CDNs).
- Uses placeholders for site values: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Testing instructions
1. Open contact.html in a modern browser.
2. Select up to three goals and click "Map My 30 Days" to view the generated path map and milestones.
3. Watch the testimonials rotate every ~4.2 seconds. Hover badges to see tooltips.
4. Submit the contact form (local alert) to test form handling.

Integration notes
- This chunk assumes other site pages (index.html, about.html, programs.html, services.html, pricing.html, testimonials.html, book.html) exist and are linked via the navigation.
- Visual pattern file reference: assets/img/pattern.svg is referenced by the overall design but not included in this chunk. Add a unique SVG in that path in another chunk to complete the visual language.

Accessibility
- The path track uses aria-label and the code attempts to keep interactions keyboard-friendly. Tooltips are visible on hover; for full keyboard accessibility, add focus handlers in a later pass.

Style and copy
- Copy uses a warm storyteller tone and new metaphors ("30-day path", "small steady changes"). Phrasing and CTA use the provided placeholders.

Notes for builders
- All assets are local. If bundling, ensure other pages and assets are placed at the same relative paths.
- This file purposefully avoids external fonts and images; styling relies on system fonts and CSS.

If you need the matching assets (SVG pattern) or the remaining pages in this variant, request the next chunk.