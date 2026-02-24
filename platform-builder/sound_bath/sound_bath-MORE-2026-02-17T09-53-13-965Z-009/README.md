Project: sound_bath site — chunk: contact

Overview:
This chunk produces the contact page (contact.html) and this README. The site is a small static front-end built as part of a larger sound bath events project. Replace placeholders in the HTML with your real details before publishing.

Files in this chunk:
- contact.html: The contact page, containing a contact form, local "Try it now" guided exercise modal, accessibility-conscious scroll reveal, and visitor notes including contraindications.
- README.md: This documentation file.

Placeholders to replace (case-sensitive):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (kept for other pages)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

How to preview locally:
1. Ensure the overall project folder contains the other pages (index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html) and the asset at assets/img/pattern.svg.
2. In a simple static environment open contact.html in a browser (no server required). For more features or CORS-safe requests, run a local static server: e.g. python -m http.server

Key features implemented in contact.html:
- Accessible scroll-triggered reveal: Elements marked with class "reveal" animate into view using IntersectionObserver. If the user prefers reduced motion, reveals disable animation and render instantly.
- "Try it now" guided exercise modal: A client-side-only modal offers three modes:
  - Breathing: three cycles of inhale/hold/exhale with subtle visual circle animation (respects prefers-reduced-motion).
  - Journaling: a 5-minute prompt with a local countdown timer and a small textarea for notes.
  - Intention setting: short 2-minute timer and quick-intent buttons.
  The modal runs entirely in-browser; no external audio or network is used.
- Contact form: Because this is a static demo, form submission is handled by generating a mailto: link using the provided {{EMAIL}} placeholder. This avoids the need for a backend while still offering a practical flow.
- Contraindications disclaimer: A clear, responsible medical advisory is included in the contact content.

Accessibility notes:
- The page respects prefers-reduced-motion for both the scroll reveals and the breathing animation.
- Modal uses role="dialog" and aria-hidden toggling. Escape closes the modal. Clicking backdrop closes the modal.
- Color contrast is considered; however test in target environments and adjust variables in the :root for brand colors.

Assets required elsewhere:
- assets/img/pattern.svg: referenced by the page as a repeating background. The main project should include a bespoke SVG pattern. No external fonts or CDNs are required.

Integration pointers:
- Navigation links point to the canonical page names used across the site. If you rename pages, update the nav accordingly.
- The contact form currently uses mailto: to deliver messages. To hook up a real form backend, change the form action and remove the JavaScript mailto handling.

Security & privacy:
- This implementation does not store or transmit data to third-party services. If you integrate a form provider, review its privacy policy and ensure you obtain consent where required.

Developer notes:
- The code avoids third-party libraries. IntersectionObserver is preferred; an on-scroll fallback is provided for older browsers.
- The breathing animation toggles a simple class on the visual element; if your brand has motion guidelines, replace with a designer-approved sequence.

If you need additional pages or another chunk, request the files with the same NDJSON format.