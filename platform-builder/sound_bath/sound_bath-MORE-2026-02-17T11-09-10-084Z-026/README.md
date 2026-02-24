Chunk 4 — contact page and readme for sound_bath site

Files included:
- contact.html: Complete contact page with inline CSS and JS. Contains:
  - Header/navigation (labels: Home, Gatherings, One-on-One, Investment, About, Q&A, Reserve, Connect)
  - Contact form (name, email, phone, preferred date, message, subscription checkbox)
  - Safety/contraindications disclaimer section
  - Side meta with phone/email/placeholders
  - Primary CTA button that uses placeholder {{PRIMARY_CTA_URL}} or falls back to book.html
  - Inline decorative SVG pattern (unique to this build)
  - 'Try a Mini Practice' guided exercise modal implemented entirely in JS (breathing visual, journaling line, intention)
  - Scroll-triggered reveal for sections using IntersectionObserver with prefers-reduced-motion support

Notes for testing locally:
1. Open contact.html in a browser.
2. Test the form interactions (no server required). The Send button simulates a response.
3. Click "Try a Mini Practice" to run the guided modal. Use Escape or Close to dismiss.
4. Check reduced-motion behavior by toggling OS-level "reduce motion" and reloading: animations and reveal transitions will be disabled.

Placeholders used (replace in deployment):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design & accessibility decisions:
- Visual-only breathing cue (no audio) to avoid delivering unexpected sound through browsers.
- Prefers-reduced-motion respected for both the breathing visual and scroll reveals.
- Contraindications shown on the contact page to encourage safe booking conversations.

This chunk intentionally avoids external assets and uses only local, inline resources.