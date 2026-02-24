This chunk contains the contact page and brief documentation for the private practice site.

Files included:
- contact.html — The contact / connect page for the site.

Key features implemented in contact.html:
- Mood-to-Method selector: a small interactive control where visitors pick their current state (anxious, stuck, grieving, burnout, curious). The page updates a recommendation blurb and changes the primary CTA label and link. The CTA appends a mood query param to {{PRIMARY_CTA_URL}} where possible.
- Glass-morphism visual theme (CSS only). The page uses a patterned background reference to assets/img/pattern.svg (unique SVG expected elsewhere in the project).
- A clinician-authored tone for session boundaries, confidentiality, scope and referrals. Contains an accordion with "Session boundaries & expectations", "Confidentiality & limits", and "Scope, referrals & continuity".
- Respectful crisis footer: clear instruction to contact local emergency services in immediate danger. No medical claims or guarantees are made.
- Contact form that opens the user's mail client (mailto) prefilled to {{EMAIL}}. The form does not send data to external servers — this is intentional to keep the implementation local-only.

Placeholders (must be replaced during build/deployment):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for integrators:
- The page is self-contained: HTML, CSS, and JS are local. No external fonts or CDNs are referenced.
- The primary CTA is updated by JS; if {{PRIMARY_CTA_URL}} is relative the script falls back to concatenating the mood param.
- The patterned background references assets/img/pattern.svg. Ensure that file exists in the project (a unique SVG pattern per project requirements).
- The copy avoids promises of outcomes and follows clinical boundaries. Adjust content for local licensing/ethical rules as needed.

Accessibility considerations:
- Interactive controls use buttons and ARIA-friendly structure where appropriate.
- Accordion content expands/collapses with a visible state change.

Customization ideas:
- Hook the form submit into a secure backend for request tracking and confirmation emails.
- Replace the mailto fallback with an API call to an appointment booking system.
- Localize text strings or add translations as needed.

This chunk is intended to be dropped into the larger site structure alongside the other pages listed in the project (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html).