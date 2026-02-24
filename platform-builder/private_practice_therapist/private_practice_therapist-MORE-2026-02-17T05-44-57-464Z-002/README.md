Project chunk: contact — private_practice_therapist-MORE-2026-02-17T05-44-57-464Z-002

Files included in this bundle:
- contact.html  — Contact page with intake form, confidentiality & crisis notes, and a client-facing guided practice modal.

How to view locally:
1. Save the files to a folder.
2. Open contact.html in a modern browser (Chrome, Firefox, Edge, Safari).

Key features implemented:
- Guided practice modal: "Try it now" opens a small, self-guided toolkit with three practices — Breathing, Journaling, and Intention-setting. Runs entirely in the browser (no external services). The breathing tool uses a simple timer and CSS animation; journaling saves to localStorage; intention echoes a short, kind affirmation.

- Accessibility and motion preferences:
  - The site respects prefers-reduced-motion. If the user requests reduced motion, the scroll reveal behavior and breathing animation are disabled or simplified.
  - The modal includes a basic focus trap and supports Escape to close.

- Scroll-triggered reveal:
  - Sections marked with the "reveal" class are observed with IntersectionObserver and become visible as they scroll into view.
  - If prefers-reduced-motion is set, reveal shows immediately without animation.

Therapist-specific notes (content conventions used):
- Language avoids medical claims or guarantees and uses supportive, clinician-voiced phrasing.
- Includes confidentiality statement and scope note, and a clear crisis instruction block (examples given for U.S. crisis contact). Adjust localization if outside the U.S.
- No manipulative urgency or scarcity techniques are used.

Placeholders present in the template (replace when deploying):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for integration:
- This bundle references an SVG pattern at assets/img/pattern.svg elsewhere in the project; add a unique SVG there when integrating the full site.
- Form submission is client-only in this demo; replace with a server endpoint or form service when ready to collect inquiries.

Design & implementation choices:
- The page uses only local HTML, CSS, and JavaScript — no external assets, fonts, or libraries.
- Visual interest is created via CSS gradients, shadows, and a small animated "pulse" for the breathing practice; the experience remains simple and calm to match clinical tone.

Privacy & safety reminder:
- The contact form and guided practices are not a substitute for emergency care. Ensure the site keeps clear crisis instructions and local emergency resources for your region.

If you need additional pages in this chunk (bookings, intake paperwork, or localized crisis resources) or a server endpoint for submissions, I can provide the next iteration.