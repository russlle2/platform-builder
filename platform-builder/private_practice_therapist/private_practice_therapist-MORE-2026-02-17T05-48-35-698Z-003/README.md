Contact page for the private practice therapist template (chunk 4).

Files included in this bundle:
- contact.html — The contact page and two embedded Session Planner widgets. Includes an accessible scroll-triggered reveal and an inline decorative SVG pattern.

Notable features:
- Two independent Session Planner widgets that generate a plaintext summary and support copying to clipboard. These are client-side only (no submission endpoint).
- Scroll-triggered section reveal using IntersectionObserver; respects prefers-reduced-motion and reveals sections immediately if reduction is requested.
- A contact form that prepares a plaintext email summary you can paste into your email client.
- No external assets or CDNs. The visual pattern is embedded inline via SVG in contact.html.

Placeholders present (do not replace in this bundle):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility notes:
- Motion reduction honored via matchMedia('(prefers-reduced-motion: reduce)').
- Planner summaries use aria-live for polite updates.

Content notes (clinician-oriented):
- Includes confidentiality, scope, and crisis notice language. Avoids medical claims and guarantees.

How to preview:
- Open contact.html in a modern browser (Chrome, Firefox, Safari). The page is static and runs the interactive features entirely in the browser.

If you need the assets/svg file referenced elsewhere in the project, check other chunks of the build for assets/img/pattern.svg.