Contact page and notes for the private practice template.

Files included in this bundle:
- contact.html — The contact page with a mood-driven selector and accessibility-minded accordion for session boundaries and confidentiality.

Key features implemented:
- Mood-to-Method selector: Five mood buttons update a recommended approach, description, and the primary CTA text and URL query (client-side only). The chosen recommendation is also placed into a hidden form field (recommended_method) so the intake request can reflect the user’s immediate needs.
- Session boundaries & Confidentiality accordion: Two accessible accordion items (Session boundaries & mutual expectations, Confidentiality & limits). Both are written in clinician-voice and include a crisis footer reminding users to call emergency services for immediate danger.
- Form: Standard contact fields with a required name and email, plus a message area and a hidden recommended_method field populated by the mood selector.
- No external assets used. The page references a local SVG pattern at assets/img/pattern.svg for subtle visual texture (unique pattern expected to be provided in the assets folder elsewhere).

Placeholders to be replaced where server-side templating or a CMS will insert real values:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility & legal notes:
- The page avoids implying guarantees or medical claims and contains clear confidentiality and limits language.
- The crisis notice instructs users to call local emergency services in urgent situations and states that the form is not monitored for emergencies.

Integration guidance:
- Ensure assets/img/pattern.svg exists and follows the expected visual style for the site.
- If the contact form should POST to a server, configure {{PRIMARY_CTA_URL}} to accept form submissions or wire up a client-side handler to send data to your intake endpoint.
- The mood selector appends a recommended parameter to the CTA link and stores a machine-friendly key in the hidden form field; use that value to route requests to appropriate intake flows.

Design notes:
- Navigation labels intentionally differ from other pages (Meet, Offerings, How I Work, Investment, Events) to provide variety across the site.
- Copy uses grounded, clinician-authored language and avoids manipulative urgency.

If you need a matching SVG pattern file or a variant of the mood-to-method mapping, I can generate those next.