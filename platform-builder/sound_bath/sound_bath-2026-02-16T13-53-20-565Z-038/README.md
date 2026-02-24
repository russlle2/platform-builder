# Chunk 4 — Contact Page and README

This bundle contains the contact page and a README for the Sound Bath Events site (layoutFamily: zen_minimal, voice: playful_premium, offerModel: intensive).

Files included in this chunk:
- contact.html — the contact page with full hero, diagnostic, plan, micro_habits, pricing, and cta sections.
- README.md — this file.

Notes & implementation details:
- Placeholders to replace at build time: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{NEXT_EVENT_DATE}}.
- The contact page is self-contained and uses inline CSS and an embedded SVG backdrop to provide visual richness without external assets.
- Accessibility: form fields include labels; navigation has aria-label. The backdrop SVG is placed behind content and marked aria-hidden.
- Sound-bath content: includes sensory language, what to bring, contraindications disclaimer, and a detailed flow of the session. Instruments referenced are crystal bowls, chimes, tuning forks, and a gong to keep text distinct from other pages.
- Navigation labels vary subtly to avoid repetition across templates: "Gatherings", "1:1 & Private", "Invest", "Need-to-know", "Reserve", "Connect".

How to use:
- Drop contact.html into your static site root alongside the other pages listed in the project.
- Replace placeholders with the real content before publishing.
- No external fonts or images are required; the page relies on system fonts and inline SVG for the decorative pattern.

Design choices:
- Layout uses a two-column hero with a contact form in a right-hand card for quick conversions.
- Emphasis on sensory cues and premium language to align with the brand voice.
- Micro-habits and a small planning section help convert curious visitors into prepared attendees.

If you need additional pages or the SVG pattern as a separate asset, request the next chunk and specify which assets to export as standalone files.