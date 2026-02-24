# wellness_coach-MORE-2026-02-17T05-25-22-082Z-047 (chunk 4)

This chunk contains two files for the wellness coach site (layoutFamily=asym_masonry, voiceFamily=clinical_calm):

Files included:
- contact.html — Contact page and interactive toolkit.
- README.md — This file.

Key features implemented on contact.html:
- Contact form using placeholders: no backend is wired. Submitting the form triggers a local alert and resets the form. Replace or hook to a real endpoint as needed.
- 7-day habit/challenge generator: provide a habit title and optional micro-step, then click "Make 7-day challenge" to generate a checklist. Use "Print checklist" to open a print-friendly window and print directly.
- Guided exercise modal (pure client-side JS): three modalities included: breathing, journaling, intention setting. Each opens in an accessible modal, runs locally, and stores journal/intentions to localStorage when you choose to save.
  - Breathing: paced inhale-hold-exhale cycles with a simple animated circle.
  - Journaling: timed 3-minute prompt with local save to browser storage.
  - Intention setting: create and save one-line intentions locally and copy to clipboard.
- Accessible modal (keyboard Esc to close, backdrop click closes, aria attributes present).

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for integration:
- This chunk references assets/img/pattern.svg as a background repeat pattern. Ensure the project includes a unique pattern at that path (not provided in this chunk).
- No external fonts, images, or CDNs are required; icons and visuals are implemented with simple SVG-like shapes via CSS and layout.
- All interactive features are implemented with plain JavaScript — no libraries required.

Accessibility & behavior:
- Modal has role="dialog" and uses aria-hidden toggling; pressing Escape closes the modal.
- Print opens a new tab/window and triggers window.print() on load; popup blockers or browser settings may affect behavior.
- Local storage keys used: "wc_journal" (array of saved journal entries), "wc_intent" (single saved intention).

Developer tips:
- Hook the contact form to your server by updating handleContact(e) to send a fetch POST to your endpoint and remove the alert fallback.
- You can adjust the breathing timing by changing phaseDur in renderBreathing().
- To export saved journals, inspect localStorage('wc_journal') or implement an export button.

This chunk intentionally keeps copy focused on outcomes, habits, and frameworks (no medical claims) and uses membership-oriented framing in the UI copy.

End of chunk 4.