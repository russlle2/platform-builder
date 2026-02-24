# sound_bath — contact page (chunk 4)

This bundle contains the contact page and a short README for the sound bath template.

Files:
- contact.html — contact page designed in a zen_minimal, minimal_poetic voice. Includes:
  - Inline SVG background pattern (also referenced as assets/img/pattern.svg for integration).
  - Contact form with fields for name, email, phone, interest, preferred date, attendees, and message.
  - Sections: hero, how conversation flows, what to bring, contraindications, session palette, contact details.
  - Placeholders to be replaced in your build system: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{NEXT_EVENT_DATE}}.

Notes for integration:
- The form posts to {{PRIMARY_CTA_URL}} — wire this to your backend or form processor.
- A unique SVG pattern is embedded inline. If you prefer an external asset, extract the <svg> block and save it as assets/img/pattern.svg and reference it in your CSS.
- No external fonts or CDNs are used. Adjust colors in :root to match your brand palette.
- The page intentionally avoids heavy imagery; visual richness is provided via gradients, SVG pattern, and layout.

Accessibility & safety:
- Input fields include focus outlines and readable sizes. Maintain server-side validation and include CAPTCHA where needed.
- The page includes a contraindications section; ensure that booking workflows collect any critical medical disclaimers.

How to use:
1. Place contact.html alongside other pages: index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html.
2. Replace placeholders via your templating/build tool.
3. Optionally extract the embedded SVG into assets/img/pattern.svg for reuse across pages.

Design intent:
- Minimal, tactile, and sensory-forward. Language is calm and direct to suit a premium sound bath service.

Seed: 1228145593 | layoutFamily: zen_minimal | voiceFamily: minimal_poetic | offerModel: events_series
