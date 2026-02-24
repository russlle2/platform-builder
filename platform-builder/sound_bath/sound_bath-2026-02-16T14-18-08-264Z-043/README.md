Project: sound_bath (slug: sound_bath-2026-02-16T14-18-08-264Z-043)

Scope:
- This chunk includes two files: contact.html and README.md.
- The contact page follows the zen_minimal layoutFamily and minimal_poetic voiceFamily.
- The page is designed for an events_series offering model and includes: hero, ritual, what_to_expect, schedule, pricing, faq, and a call-to-action contact form.

Placeholders to fill when deploying:
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
- {{NEXT_EVENT_DATE}}

Assets:
- This page references an SVG pattern at /assets/img/pattern.svg. Ensure that file exists and complements the visual style (subtle repeat pattern, low opacity).

Notes & accessibility:
- No external fonts or CDNs are used; styling is achieved with CSS gradients and the external SVG pattern.
- The contact form posts to {{PRIMARY_CTA_URL}}. Replace that with a server endpoint or mail-forwarding service as appropriate.
- Content includes sensory guidance, what to bring, contraindications, and a session flow description to meet sound bath rules.

How to preview:
- Place contact.html in a simple static server folder alongside the other site pages.
- Ensure /assets/img/pattern.svg is present at the given path.
- For local preview: python3 -m http.server 8000 (then visit http://localhost:8000/contact.html)

Notes for designers/developers:
- Navigation labels are intentionally varied across templates; adjust other pages to maintain subtle differences.
- Instrument palette here emphasizes chimes, tuning forks, and monochord—vary instrument lists on other pages to avoid repetition.

License & credits:
- Created with a minimal-poetic voice for a premium sensory sound-bath brand.
- Designed for clarity and calm; modify copy to match your legal and medical guidance as needed.