Contact page and usage notes for the split_diagonal cohort site chunk.

Files in this chunk:
- contact.html — interactive contact + whole-person inventory + guided practice modal.

How to test locally:
1. Drop contact.html into the project root (alongside the other pages).
2. Open contact.html in a modern browser.

Main features implemented on contact.html:
- Whole-person inventory: check areas and click "Create agenda" to produce a prioritized consultation agenda plus a suggested follow-up cadence. The agenda is based on a simple heuristic and can be copied to clipboard.
- Guided practice modal: accessible via "Try a short practice" buttons. Three short guided mini-practices are provided entirely in front-end JS:
  - Breathe: a cyclical inhale-hold-exhale guide with a pulsing circle and countdown.
  - Journal: a 3-minute timed writing prompt with a save-to-clipboard action.
  - Intention: select or type a short intention and a tiny step; it shows confirmation.
- Contact form: simple front-end validation and simulated send with a friendly acknowledgment. No server calls included; replace with your API endpoint if needed.

Notes & considerations:
- Placeholders present and required by the template: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}. Replace them in your templating pipeline.
- UI is self-contained: no external fonts or assets are required. The layout references an SVG pattern in other chunks (assets/img/pattern.svg) but none is required for the contact page to function.
- This page intentionally uses educational, supportive language and includes a short disclaimer in the contact card. It does not promise cures and is suitable for integrative/holistic health contexts.

Customization pointers:
- Adjust the cadence logic inside the inventory script to match your program offerings (cohort vs individual cadence).
- Hook the contact form to your backend by replacing the simulated send with fetch()/XHR.
- The guided practices are intentionally minimal; enhance timers, accessibility announcements, or audio cues as desired.

If you need a variant of this page with different nav labels, or integration with a booking endpoint, tell me which booking system or API you plan to use and I will update the contact form accordingly.