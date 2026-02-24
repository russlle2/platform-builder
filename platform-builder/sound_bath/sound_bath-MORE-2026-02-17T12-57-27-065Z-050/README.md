Contact page for the sound bath site (chunk 4)

Files included in this bundle:
- contact.html — interactive contact & planning page

Purpose
- A calm, clinical-toned contact page that includes two small local interactive tools:
  1) Session Planner — compose a plaintext plan summarizing the intended session. The plan can be copied to clipboard and pasted into booking notes.
  2) Seat Selector + Packing List — choose a simulated upcoming session, pick seat quantity, and produce a tailored "what to bring" list. A reserve button simulates seat reduction.

Placeholders used (replace with real values during integration):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes on behavior
- No external network requests are made.
- The contact form is a demo-only, local handler that shows status messages but does not submit data.
- The seat selector uses a local in-memory availability map; the "Reserve (simulate)" button decreases the local available count.
- The Session Planner builds a short plaintext summary based on the selected options and notes. Use the "Compose summary" button then "Copy" to send the text into any booking form.

Accessibility & safety
- Contraindications and health advisories are included directly on the page. Ensure these remain visible and up-to-date according to local policies.

Integration tips
- Link this page from the site navigation: contact.html
- The decorative pattern is inline in this file for the contact view. Other pages reference assets/img/pattern.svg; provide a unique SVG at that path for consistent branding across the template.

Local testing
- Open contact.html in a modern browser (Chrome, Firefox, Edge, Safari).
- Test planner: choose options, click "Compose summary", then "Copy" and paste into a text editor.
- Test seats: select different sessions, change seat count, click "Reserve (simulate)" and observe the available count change.

Developer notes
- Keep the contraindications copy visible and do not remove it.
- The UI uses vanilla JS and no build step; you can extract the small scripts if you prefer module structure.

Design decisions
- Clinical-calm voice and restrained color palette to support a membership-oriented offering.
- The session planner emphasizes plaintext export to simplify inclusion in booking flows or email messages.

If you need additional pages or the SVG asset created, request the next chunk which includes assets and other pages.