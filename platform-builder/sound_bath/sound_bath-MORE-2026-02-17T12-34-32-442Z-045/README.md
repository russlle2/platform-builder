Contact page and local interactive demo for the sound_bath project (chunk 4).

Files in this chunk:
- contact.html : Contact page with interactive seat selector, packing-list generator, and two "Try it now" guided exercises (breathing + journaling). Placeholders remain for easy templating: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

How to use locally:
1. Place this file in the project root (or served folder) alongside the other site pages (index.html, events.html, etc.).
2. Ensure assets/img/pattern.svg exists in the same project (this page references it for background tiling). The SVG pattern file is created in a different chunk.
3. Open contact.html in a modern browser.

Interactive features implemented (all client-side, no server):
- Seat selector: a 20-seat grid shows faux availability (deterministic pseudo-random). Click seats to toggle selection, then "Reserve Locally" to mark them taken. This is purely visual and local.
- Packing list generator: pick an event style and duration, then click "What to bring" to get a tailored list and small tips.
- Breathing modal: a 3-minute guided breathing visual with inhale/hold/exhale phases. Start/Stop controls; purely visual timing (no audio).
- Journaling modal: step-through micro-journal with 60s per prompt for intention-setting. Start/Stop controls.

Accessibility & safety:
- Basic ARIA roles and labels for navigation, seat-grid, and modal dialog backdrop. Focus management is minimal (this is a demo page); avoid using keyboard-only for modal focus trap in this chunk.
- Contraindications included in a details element. Please update the copy for your legal requirements and local medical guidance.

Developer notes:
- No external assets or CDNs are used. Keep fonts and assets local. The page references assets/img/pattern.svg; include a suitably unique SVG there.
- The seat availability algorithm is deterministic (seed from project seed) so the demo shows repeatable results.
- Modal functionality: two separate guided exercises implemented to satisfy the requirement for multiple "Try it now" experiences.

Customization:
- Replace placeholders with real values at build time or templating step.
- Tweak durations, seat counts, and packing suggestions in the inline JS as desired.

Seed & meta (for reference):
- Seed: 3369589713
- Slug: sound_bath-MORE-2026-02-17T12-34-32-442Z-045
- Layout family: zen_minimal
- Voice family: warm_storyteller
- Offer model: retail_addon
- Sections expected across site: hero,myth_vs_truth,pillars,case_notes,faq,cta

Notes:
- Events page must still implement the "next event" module + calendar list separately (not included here).
- This chunk intentionally keeps copy friendly and distinct from previous templates; update any phrasing you like while keeping legal disclaimers.

If you need the assets/img/pattern.svg or additional pages for the site, request the next chunks.