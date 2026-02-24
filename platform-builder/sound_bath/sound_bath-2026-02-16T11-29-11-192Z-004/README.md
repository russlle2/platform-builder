Sound Bath — contact.html

This chunk contains two files for the sound bath membership site: contact.html and this README.md.

Overview
- Purpose: contact page tailored for a premium sensory sound-bath brand. Includes hero, diagnostic, plan, micro_habits, pricing, and cta sections.
- Voice: warm_storyteller, sensory and premium tone.
- Offer model: membership-first (mentions membership benefits and priority booking).

Files
1) contact.html
- A full standalone contact page with inline CSS and an embedded SVG decorative pattern.
- Sections included (unique structure & order): hero, diagnostic, plan, micro_habits, pricing snapshot, cta.
- Safety & session rules present: "what to bring", contraindications disclaimer, and detailed session flow.
- Instrument palette is described with varied items (crystal singing bowls, gong, koshi chimes, tuning forks, monochord).
- Contact form: builds a mailto link using JavaScript; uses placeholders for {{EMAIL}}, {{PHONE}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{VENUE_NAME}}, {{FACILITATOR_NAME}}, {{CITY}}, {{STATE}}.
- Navigation labels deliberately varied (Gatherings, Calendar, Sessions, Invest, Our story, Connect).

2) README.md (this file)
- Explains what's included, the placeholders to replace, and notes about visual assets.

Placeholders to replace in templates
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{FACILITATOR_NAME}}
- {{VENUE_NAME}}
- {{NEXT_EVENT_DATE}} (not directly used on this page but present in project scope)

Design & implementation notes
- No external images or fonts are referenced; visual richness is achieved with CSS gradients and an inline SVG pattern.
- The page is responsive: grid collapses to single column under 980px.
- Contact form behavior: opens the user email client with structured subject and body. Intended minimal form-handling so the site can function without a backend.

Meta
- Slug: sound_bath-2026-02-16T11-29-11-192Z-004
- Seed: 2335760085
- layoutFamily: aura_editorial
- voiceFamily: warm_storyteller
- offerModel: membership

Usage
- Replace placeholders with real values.
- Integrate into broader site (index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html).
- Consider adding server-side form handling or an API endpoint for submission if you need form persistence.

Notes on uniqueness
- This contact page intentionally varies headings, metaphors, instrument lists and nav labels compared to other site pages to satisfy uniqueness constraints.

End of README.