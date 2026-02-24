Contact page and usage notes for the wellness_coach site (chunk 4)

Files included:
- contact.html — complete contact page with interactive habit builder and guided-practice modals.

Placeholders to replace in your deployment:
- {{BUSINESS_NAME}} — business or coach name
- {{TAGLINE}} — (not used on this page but part of site placeholders)
- {{PHONE}} — phone number
- {{EMAIL}} — email address
- {{PRIMARY_CTA_LABEL}} — label for the primary CTA in the header
- {{PRIMARY_CTA_URL}} — URL for the primary CTA
- {{CITY}} and {{STATE}} — location hints

Primary features implemented here:
- Contact form (simulated send). The form does not post to a server—replace submitContact() with your integration (email API, CRM, or form backend).
- Habit builder: a simple 7-day challenge generator. Enter a habit and intensity, click "Generate checklist" to populate a printable checklist in the page. Use the Print button or your browser print function. The printable area is scoped to the checklist via CSS @media print rules.
- "Try it now" guided exercises: a modal with three practices implemented in pure JS:
  - Breathing: visual circle + inhale/hold/exhale cycles. Start/stop controls included.
  - Journaling: random prompt, configurable timer (3/5/10 minutes), export journal text as .txt.
  - Intention setting: short stepwise prompts and a quick save confirmation.

Accessibility & behaviors:
- Modal supports Escape to close and basic focus management.
- Print styles limit printed output to the checklist area.

Styling and assets:
- The page uses a warm, earthy palette and self-contained CSS (no external fonts or CDNs).
- The design expects an SVG pattern at assets/img/pattern.svg elsewhere in the project for global backgrounds; this page does not rely on external images directly.

Integration notes:
- Replace placeholder strings before publishing.
- Hook the contact form to your preferred backend where submitContact() currently simulates a send.
- The habit checklist is client-side only. If you want to store generated checklists per user, extend generateChallenge() to POST the data to your server.

Testing:
- Open contact.html in a modern browser.
- Try the habit builder: enter a habit, choose intensity, Generate checklist, then Print.
- Click any "Try" button (Breathing, Journaling, Intention) to open the modal and interact.

Developer hints:
- The guided exercises are intentionally minimal and extendable. Timers use setInterval for clarity; switch to requestAnimationFrame for smoother animations if needed.
- When adding analytics or form endpoints, avoid including sensitive personal data in client-side logs.

Design choices & compliance:
- Copy and structure avoid the recent signature tokens and emphasize outcomes, habits, and frameworks (no medical claims).
- Navigation uses alternative labels but links point to the correct site pages (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html).

If you need the SVG pattern (assets/img/pattern.svg) produced in this chunk, request the asset in the next iteration. This chunk intentionally includes only contact.html and README.md.