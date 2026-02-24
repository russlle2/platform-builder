Contact page and tools — private_practice_therapist-MORE-2026-02-17T08-45-48-382Z-044

Files in this chunk:
- contact.html — the contact page with two interactive clinician-facing tools (Session Planner; Self-screening intake wizard).

Purpose and features:
- Session Planner
  - An on-page, client-facing widget that assembles a brief plaintext plan describing goals, rhythm (weekly/biweekly/etc.), session length, focus areas, and optional notes.
  - Includes a copy-to-clipboard export so a prospective client can paste the plan into a booking form or share it by email.
  - Implemented entirely with local JavaScript and DOM manipulation; no external services.

- Self-screening intake wizard
  - A short, non-diagnostic set of prompts that generate a plain list clients can bring to an initial consultation.
  - Produces shareable text and supports copying to clipboard.
  - Language avoids medical claims and frames outputs as preparatory conversation prompts.

Design notes:
- Clinical, calm voice suitable for a licensed clinician. Includes confidentiality, scope boundaries, and a clear crisis note (no emergency services provided).
- Navigation uses an alternative label set (Home, Services, Process, Rates, FAQ, Schedule, Connect) and correct local links to the site pages.
- Uses placeholder tokens: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}} — replace these in your deployment process.

Accessibility and behavior:
- Keyboard-friendly buttons. Copy operations use navigator.clipboard where available and fall back to instructing manual copy on failure.
- Responsive layout with a two-column arrangement that collapses for narrow viewports.

Clinical & legal guidance included in copy:
- Clear confidentiality notice and scope boundaries.
- Crisis and emergency instructions point to calling local emergency services or crisis lines.
- No diagnostic language or medical promises.

Testing locally:
1. Place contact.html inside the project folder along with the other site pages (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html).
2. Ensure assets/img/pattern.svg exists in the project root if you want the page header pattern to appear. (This chunk references assets/img/pattern.svg but does not include it.)
3. Open contact.html in a browser. Interact with the "Make plan" and "Create intake prompts" buttons to generate and copy content.

Notes for integration:
- The copy buttons rely on the Clipboard API (navigator.clipboard). On some browsers or file:// contexts, copy may be restricted; run from a local server (python -m http.server or similar) if needed.
- Replace placeholder variables server-side or with a simple templating step before publishing.
- This page intentionally does not attempt to send form data to a server; it focuses on producing shareable plaintext outputs and linking to the booking page.

Ethical and content boundaries reminder:
- Do not present any output as a diagnostic result. The tools are preparatory and informational; they are not substitutes for a clinical assessment.
- Keep all client communications private and follow applicable privacy regulations in your jurisdiction when collecting or storing information.

Version info:
- Niche: Private Practice Therapist
- Layout family: split_diagonal
- Voice family: clinical_calm
- Offer model: membership

If you need a standalone assets/img/pattern.svg or adjustments to the intake prompts or planner fields (e.g., different membership tiers or pricing language), I can provide a matching SVG and an updated contact.html in the next chunk.