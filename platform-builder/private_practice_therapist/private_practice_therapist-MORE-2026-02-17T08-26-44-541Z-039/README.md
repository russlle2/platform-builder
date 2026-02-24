# Contact Page — private_practice_therapist

This bundle contains the contact page and documentation for the private practice therapist site (chunk 4).

Files:
- contact.html — the full contact page with interactive features.
- README.md — this file.

Placeholders (must be replaced in production):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Interactive features implemented locally (no external services):
- Pricing Comparator: a toggle between "Monthly" and "Packages". Prices animate using requestAnimationFrame and an easing function to visually compare options.
- Mood-to-Method selector: choose a current state (Overwhelmed, Stuck, Anxious, Transitioning, Grief). The recommendation card updates its title, body, and the CTA label and link dynamically to help people choose an appropriate next step.

Notes & therapist requirements:
- Copy is intentionally supportive and avoids medical claims or guarantees.
- Confidentiality and scope boundaries are stated in the form area. There is a crisis note advising users to seek emergency services for life‑threatening situations.
- No manipulative scarcity tactics or promises of specific outcomes.

Design notes:
- Layout is a two-column hero with a contact form and interactive side content. A subtle SVG pattern is referenced at assets/img/pattern.svg (local asset).
- Navigation labels differ from common templates: Welcome, How I Help, Focus Areas, Method, Investment, Questions, Session, Connect.

Local usage:
- Open contact.html in a browser. Replace placeholders either by server-side templating or by a simple search-and-replace.
- No external fonts or CDNs are required.

Accessibility:
- Buttons and toggles include basic ARIA attributes (role, aria-selected where relevant).

Developer notes:
- The contact form currently uses a mailto fallback for demo purposes. Hook up a server endpoint if you need persistent form handling.
- Pricing numbers are stored on each .num as data-month and data-package attributes for easy adjustment.

License: MIT-style for project integration.