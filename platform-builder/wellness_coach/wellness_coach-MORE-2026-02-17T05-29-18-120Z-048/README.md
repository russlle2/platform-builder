# Contact Page — wellness_coach

This bundle contains the contact page and usage notes for the wellness coach site (slug: wellness_coach-MORE-2026-02-17T05-29-18-120Z-048).

Files included:
- contact.html — full contact page (self-contained HTML/CSS/JS). Embeds an inline SVG pattern and interactive features.

Placeholders to replace in contact.html:
- {{BUSINESS_NAME}} — site/business name
- {{TAGLINE}} — short tagline
- {{PHONE}} — contact phone number
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — primary CTA label used in header and buttons
- {{PRIMARY_CTA_URL}} — (used elsewhere in other pages)
- {{CITY}} — city for contact block
- {{STATE}} — state for contact block

Interactive features implemented (local JS only):
- 7-Day Habit Builder
  - Enter a concise habit name and start date.
  - Generates a seven-row checklist with day labels and dates.
  - Print the checklist via the browser print dialog (creates a printable clone).
  - Export the plan as JSON for saving.

- Guided exercise modal (Try it now)
  - Breathing exercise: runs inhale-hold-exhale cycles with visual scaling and a countdown. Choose cycle counts.
  - Journaling exercise: 3-minute timer and a freeform textarea for a short writing sprint.
  - Intention exercise: create and save a single intention + micro-action to sessionStorage.

Design notes and constraints:
- No external assets or CDNs. All styles and scripts are inline.
- Simple earthy/warm color palette and approachable, premium-playful voice.
- No medical claims; only habit/outcome framing.
- Navigation labels differ from prior templates: Home, Our Story, Cohorts, Services, Plans, Stories, Reserve a Spot, Connect.

How to use:
1. Drop contact.html into your site root or templating system.
2. Replace placeholders with real values in your deployment pipeline or templating engine.
3. If you want a global pattern asset, the page includes an inline SVG pattern and does not rely on assets/img/pattern.svg. You may extract the pattern as a separate file if needed.

Notes for integration:
- The contact form is a demo stub that shows a local confirmation. Hook the form to your backend or a form handler by updating submitContact(e).
- The habit plan export downloads a small JSON file; you can wire that to a backend or storage instead.
- Guided exercises do everything in-browser and persist only the intention to sessionStorage; adjust persistence as desired.

Accessibility:
- Modal can be closed with Esc and the close button.
- Basic focusable controls and readable contrast; test with assistive tech for full compliance.

If you need additional pages or assets, request the next chunk to provide the remaining templates (index, about, services, programs, pricing, testimonials, book).