# contact.html — Connect page for sound_bath

This chunk contains two files: contact.html and this README.md. The contact page is built for the sound bath events site and implements the following features locally (no external assets required):

- A contact form (demo, client-side only) with placeholders:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}

- A "Try it now" guided exercise modal that runs entirely in client-side JavaScript. It includes three micro-practices:
  - Breathing: visual circle with timed inhale/exhale cycles.
  - Journaling: 2-minute prompt and live countdown.
  - Intention: quick pick or custom phrase save.

- Scroll-triggered section reveal using IntersectionObserver, with proper respect for the user's prefers-reduced-motion setting (if reduced motion is preferred, reveal animations are disabled and content becomes visible immediately).

- Contraindications section responsibly listed, encouraging contact or private pre-session calls when relevant.

- Visual styling is self-contained CSS; the page references an SVG pattern at `assets/img/pattern.svg` for decorative striping. The actual asset should be placed at that path by the build system (this chunk does not include the SVG file). Ensure a unique SVG is used there as required by the project brief.

Notes for integration and testing:

- The contact form only shows a client-side alert to simulate message submission. Replace the form submit handler with your backend endpoint or a mailto link as needed.
- The phone button uses a `tel:` link built with the {{PHONE}} placeholder.
- The modal is accessible: it can be closed with Escape or by clicking the backdrop; `aria-hidden` toggles are present for basic screen reader signaling. For production, consider managing focus trapping inside the modal for improved accessibility.
- The reveal animation respects `prefers-reduced-motion` and will immediately show content when reduced motion is enabled.

Placeholders must be replaced with real values as part of templating or a build step.

If you need the pattern SVG created or this page adapted to a different layout family, tell me which variations are needed and I will update the code.