# holistic_medicine-MORE-2026-02-17T21-41-32-121Z-043 — chunk 4

This bundle contains two files for the Holistic / Integrative Medicine site (chunk 4):

- contact.html — Contact page with an embedded, local guided-exercise modal and scroll-triggered reveal animations.
- README.md — this file.

Purpose
- Provide a friendly, playful-premium contact page with clear contact methods, a short form, and an on-page micro-experience (breathing/journaling/intention) implemented in vanilla JS.

Placeholders
The page uses templated placeholders that should be replaced server-side or during build:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used on this page but present across the site)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Features implemented
- Guided exercise modal (Try a short exercise):
  - Three modes: Breathing (paced visual + timer), Journaling (timed 3-min prompt + local save), Intention (one-line anchor saved to localStorage and copyable).
  - All functionality runs in local JS. No external services or assets used.
  - Accessibility touches: role attributes, keyboard support (Enter/Space to switch tabs, Esc to close), clear labels.

- Scroll-triggered reveal animation:
  - Uses IntersectionObserver when available.
  - Respects prefers-reduced-motion: disables animation and reveals content immediately for users who requested reduced motion.

- Lightweight, self-contained styling and layout with CSS only (no external assets). Background references a site asset SVG at assets/img/pattern.svg (unique pattern should be provided in another chunk).

Notes for developers
- Navigation labels intentionally differ from standard labels to meet uniqueness requirements ("Start", "Care Finds", "Method", etc.). Ensure the other pages use corresponding filenames (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html).

- The contact form is intentionally non-networked (action="#"). Replace with your server endpoint or form handler as needed.

- The modal saves journals and intentions to localStorage with keys prefixed by "hm-". You can inspect these in the browser console (localStorage).

- The breathing visual uses a CSS animation toggled by JS; timers are managed in seconds. Adjust breath length (breathSeconds) and keyframes for different pacing.

Accessibility
- The design avoids motion for users with prefers-reduced-motion and provides keyboard controls for the modal. However, this is a lightweight implementation — consider adding: focus trap within modal, clearer aria-live regions for timers if required by policy.

How to run locally
1. Place this file and the other site files in a folder served by any static server (or open contact.html directly in a browser).
2. Ensure assets/img/pattern.svg exists (unique SVG pattern recommended).
3. Replace placeholders with real values or integrate with your templating/build system.

Developer tips
- To change the default duration of the breathing mini-practice, edit breathSeconds in the script in contact.html.
- To add more journaling prompts, update the <select id="journ-prompt"> options.
- Modal behaviour: the code is intentionally small — if you need a strict focus trap, integrate a small utility or expand the modal script to trap focus on open.

Security & privacy
- The exercise modal stores data locally only. The contact form as provided does not transmit data to remote services.

Design and tone
- The copy avoids clinical promises and encourages a supportive, educational stance — aligned with holistic guidelines.

Files in this chunk
- contact.html
- README.md

If you need additional pages or assets (SVG pattern, images), request the next chunk and specify whether pattern.svg should be inline or a separate file.
