# Contact Page — Chunk 4

Files in this bundle:
- contact.html — Interactive contact page for the wellness coach site.

Purpose and notes:
- This chunk provides the contact page for the site whose slug is wellness_coach-MORE-2026-02-17T04-25-43-870Z-033.
- The contact page follows the split_diagonal layout family and uses a clear executive voice.
- Placeholders used: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Key features implemented (local JS + HTML only):
- Guided exercise modal including three micro-practices:
  - Breathing: a timed inhale/hold/exhale cycle with simple visual timer.
  - Journaling: a 3-minute free-write timer and textarea.
  - Intention-setting: quick input with save-to-session and copy-to-clipboard behavior.
- Scroll-triggered reveal for elements with the class .reveal-on-scroll implemented with IntersectionObserver.
  - Respects prefers-reduced-motion: if the user prefers reduced motion, reveals immediately and disables animation.
- Accessible focus and ARIA considerations for the modal (aria-hidden toggles and role attributes).

Design notes:
- No external assets or fonts are referenced. The page references a local SVG pattern at assets/img/pattern.svg for subtle background texture.
- No images are included; visual interest is produced with CSS, gradients, and the referenced SVG pattern.

How to test locally:
1. Place this file into your project alongside other pages (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html).
2. Ensure assets/img/pattern.svg exists and points to an appropriate SVG pattern.
3. Open contact.html in a browser.
4. Scroll the page to see reveal animations (or test with prefers-reduced-motion on to ensure immediate reveal).
5. Click "Try a guided exercise" to open the modal and test each exercise.
6. Submit the contact form to see the simulated submission alert.

Developer hints:
- The guided practice state is intentionally ephemeral and stored only in sessionStorage for the intention item.
- The breathing and journaling timers are simple intervals; they will stop when the modal closes or when navigating away.
- Modify the breathing pattern in the startBreathing() function to change inhale/hold/exhale timings.

License: Use and adapt as needed for the project. No external libraries were used.
