Chunk 4 — contact page and notes

This bundle contains two files for the sound bath site (slug: sound_bath-2026-02-16T12-56-36-179Z-025).

Files included:
- contact.html — The contact / inquiry page, built with a glass-morphism aesthetic and a sensory-first copy tone (practical_guide voice). Includes: hero/contact header, safety & contraindications, what to bring, session flow, short FAQ, lead magnet prompt, and an inquiry form. Placeholders used where required: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{NEXT_EVENT_DATE}}.

- README.md — this file (you are reading it).

Design notes:
- Layout family: glass_morphism — implemented via translucent cards, backdrop-filter blur, and subtle gradients.
- Visual richness is achieved purely with CSS and references to an external SVG pattern at assets/img/pattern.svg (ensure that file exists in the final build).
- Navigation labels vary from other pages (e.g., "Gatherings", "Private Sessions", "Rates", "Questions", "Reserve", "Connect") to satisfy uniqueness rules.
- The copy includes safety/contraindication guidance and a full session flow as required by the sound bath rules.
- Instruments are referenced with variety (crystal bowls, chimes, gong, tuning forks, monochord) rather than repeating any single list.

Developer notes:
- Form action is a placeholder (/submit); wire to your backend or serverless endpoint.
- Keep assets/img/pattern.svg present and unique per project requirement.
- This chunk intentionally avoids external fonts or CDNs.

Seed: 1776066116
LayoutFamily: glass_morphism
VoiceFamily: practical_guide
OfferModel: vip_day

If you need edits (different CTA phrasing, alternate form fields, or additional accessibility attributes), ask specifying the change.