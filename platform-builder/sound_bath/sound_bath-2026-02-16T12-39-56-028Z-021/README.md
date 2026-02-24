Project: sound_bath — contact page (chunk 4)

This bundle includes two files for the contact page build of the sound bath site.

Details
- slug: sound_bath-2026-02-16T12-39-56-028Z-021
- seed: 2732341723
- layoutFamily: split_diagonal
- voiceFamily: minimal_poetic
- offerModel: events_series

Files in this chunk
- contact.html — complete contact page with split-diagonal layout, inline SVG pattern, contact form, brief FAQ, contraindications highlight, what-to-bring, and booking hooks. Uses placeholders:
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

- README.md — this file.

Notes & integration
- Visuals are created with CSS gradients and an embedded SVG element. No external images or fonts are referenced.
- The site-wide SVG pattern requested as assets/img/pattern.svg should be created in the assets folder by the next build chunk (or you may extract the SVG used in contact.html and place it at that path). The contact page includes its own inline pattern so it will appear correctly without external assets.
- Navigation labels vary intentionally ("Gatherings", "Rhythms", "Private", "Invest", "Answers", etc.) to meet uniqueness requirements.
- The required section pack (hero, ritual, what_to_expect, schedule, pricing, faq, cta) is represented in the contact page as focused snippets appropriate to a contact experience (hero, brief ritual/what-to-bring, FAQ highlight, scheduling/CTA).

Accessibility & safety
- Form fields include minimal required attributes. Update server-side handling at {{PRIMARY_CTA_URL}} to process submissions.
- Contraindications and what-to-bring are explicitly stated in the content to satisfy site rules.

How to use
1. Replace placeholders with real values (BUSINESS_NAME, PHONE, EMAIL, etc.).
2. Add a server endpoint or form handler for the form action ({{PRIMARY_CTA_URL}}) or change to mailto as desired.
3. Provide the global SVG asset at assets/img/pattern.svg for consistent branding across pages if you want a reusable pattern.
4. Ensure other pages (index.html, events.html, etc.) are integrated in subsequent chunks.

Design notes
- The page favors a minimal, poetic tone with sensory language, aligned to the "minimal_poetic" voice.
- Instruments and program details appear on the Events and Private Sessions pages; the contact page focuses on flow, safety, and pragmatic next steps.

If you need an alternate color scheme, more explicit GDPR/privacy text, or additional contact fields (e.g., accessibility needs, mobility requirements), request another chunk to extend this page.