Chunk 4 — Contact page for wellness_coach

This bundle contains two files for the contact page build of the membership-oriented wellness coach site.

Files included:
- contact.html — full-page contact + modal guided exercise UI + scroll-reveal logic. Use as the site\'s contact page (link from navigation). Contains placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- README.md — this file.

Key features implemented in contact.html:
- Accessible multi-mode guided exercise modal (breathing, journaling, intention setting). It runs purely client-side JavaScript and stores journal/intention locally when requested.
- Scroll-triggered reveal for sections using IntersectionObserver; respects prefers-reduced-motion by revealing content immediately if the user requests reduced motion.
- Duplicate safe-guards for environments without IntersectionObserver.
- Fully self-contained: no external fonts, CDNs, or images (note the page references assets/img/pattern.svg for an SVG background pattern expected earlier in the project assets).
- Navigation uses a distinct label set: Home, Story, Offerings, Paths, Investment, Voices, Schedule, Connect.

How to test:
1. Open contact.html in a modern browser.
2. Click "Try a short exercise" or "Quick practice" to open the modal.
3. Switch modes and press "Start 2 min" to run the practice. Try the breathing animation and the journaling/intention workflows.
4. Toggle OS-level "Reduce motion" (or simulate via browser devtools) to confirm animations are suppressed and reveals happen instantly.

Notes:
- The contact form uses a no-backend stub (onsubmit prevents default and shows an alert). Replace with your form handling endpoint as needed.
- The modal tries to be minimally intrusive and trap focus on open; adapt to a more robust focus-trap pattern for production if required.

Design & content constraints observed:
- Messaging keeps to coaching (habits, frameworks, outcomes) and avoids medical claims.
- Placeholders remain for brandable fields.
- No external assets included in this chunk per instructions; the pattern SVG should be added at assets/img/pattern.svg elsewhere in the project.

If you need the complementary pages (index, about, services, programs, pricing, testimonials, book) or the SVG asset, request the next chunk and I will produce them.