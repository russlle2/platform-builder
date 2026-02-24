# wellness_coach-MORE-2026-02-17T02-28-24-787Z-005 — Contact Page

This chunk contains the contact page and a short README for the wellness coach template.

Files included in this bundle:

- contact.html — The full contact page for {{BUSINESS_NAME}}.

About the contact page

- Layout: Modern, calm clinic-oriented design with a left-right hero, proof gallery, expectations, objections, CTA and a contact form.
- Sections present: hero, proof gallery (rotating testimonials), what_to_expect, objections, cta (contact + micro pricing comparator).
- Widgets implemented locally (no external assets):
  - Proof Gallery: rotates through testimonials every 5s; has credibility badges with hover tooltips; manual next/prev controls.
  - Pricing Comparator (mini): Monthly vs 4-Session Pack toggle with animated numbers. Uses data attributes for values.
- Placeholders used (do not replace unless programmatically):
  - {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}

Accessibility and behavior

- Simple keyboard/ARIA-friendly elements for the toggle and form.
- Contact form simulates a submit and displays a confirmation message; no backend integration is included.

Notes for integration

- The page does not load external fonts or CDNs.
- If you maintain a separate SVG asset (assets/img/pattern.svg), this page already includes an inline subtle SVG pattern for background use; replace or remove if you prefer a file-based pattern.
- The navigation labels differ from standard templates: Start, Who I Am, Plans, Support, Investment, Stories, Book Time, Connect.

Customization

- Update placeholders with the real business values.
- Tweak prices on the mini comparator by editing the data-month and data-pack attributes on elements with class "price".
- To wire the form to a backend, replace the mock submit code in the script with a fetch/XHR to your endpoint.

Design notes

- Tone: calm, clinical-calm voice; emphasizes habits, frameworks and outcomes without medical claims.
- CTA language intentionally varies from other templates — uses phrasing like "Request a call" and "Schedule a conversation".

If you need additional pages or the assets folder (including a dedicated SVG pattern file), request the next chunk.