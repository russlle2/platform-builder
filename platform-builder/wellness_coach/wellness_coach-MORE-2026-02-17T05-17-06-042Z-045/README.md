Project chunk: contact + README

Files included in this chunk:
- contact.html: Contact & intake page with an interactive 30-day "path map" and a rotating proof gallery with badges and tooltips.

Placeholders to populate when deploying:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes:
- The contact page contains a local-only form (no network calls) that replaces the form with a confirmation message on submit.
- The path map responds to the selected focus areas and regenerates a 30-day visual grid. It updates the CTA link to include chosen foci as a query string.
- The proof gallery rotates testimonials every ~4.8s and badge hover reveals tooltips.
- The page references assets/img/pattern.svg for decorative patterning; ensure that asset exists in the project.

Authoring considerations:
- Copy avoids medical claims; focuses on habits, outcomes, and frameworks.
- Navigation labels are intentionally different: Start, Approach, Offerings, Events, Investment, Stories, Reserve, Connect.

How to test locally:
- Open contact.html in a browser.
- Toggle the focus area checkboxes to see the 30-day map update.
- Observe rotating testimonials and hover badges for tooltips.
- Submit the form to see the local confirmation.

Chunk seed: 3972085914
Layout family: lux_gallery
Voice: practical_guide
Offer model: events_series
Sections present on contact page: hero, diagnostic (goals), plan (30-day map), micro_habits (goals framing), pricing pointers, cta

License: content provided as part of the project.