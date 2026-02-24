# holistic_medicine-MORE-2026-02-17T20-44-22-705Z-034 (chunk 4)

This bundle contains the contact page and a README for the holistic/integrative medicine site built with the "zen_minimal" layout family and a warm, storyteller voice.

Files in this chunk:
- contact.html — Contact page with form, visit details, privacy note, and a local guided practice modal.
- README.md — This file.

Key features implemented
- Guided practice modal (local JS only):
  - Three modes: Breathing (animated), Journal (textarea with localStorage save), and Intention (short text with localStorage save).
  - Breathing uses a simple timeline (inhale, hold, exhale) and scales the circle element. Runs entirely in-browser, no external libs.
  - Modal accessible with ARIA attributes, keyboard escape to close, and click backdrop to dismiss.

- Scroll-triggered reveal:
  - Sections marked with the "reveal" class animate into view using IntersectionObserver.
  - Respects prefers-reduced-motion: if user prefers reduced motion, elements are shown immediately with no transform.

- Design notes:
  - No external fonts, assets, or CDNs. Background pattern should be provided at assets/img/pattern.svg in the full build (this chunk references it in overall project requirements).
  - All contact details and labels use the provided placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Accessibility & privacy
- Modal uses aria-modal, role="dialog" and is dismissible via Escape and clicking the backdrop.
- The contact form is a simple front-end stub that alerts a confirmation; it does not send data to a server. Replace handleContact() with real submission logic if needed.
- The page includes a clear privacy notice and advises users not to use the form for urgent clinical concerns.

Customization
- Edit placeholders directly in the HTML file.
- To change guided practice timings or cycle count, modify the breathing sequence and totalCycles in the inline script inside contact.html.

Running locally
- Drop the project folder in a local web server or open index.html in a modern browser.
- For full visuals, place an SVG pattern at assets/img/pattern.svg as the project expects (not included in this chunk).

Notes
- This chunk intentionally contains only contact.html and README.md as requested.
- Keep any server-side or third-party integrations out of the guided practice to preserve privacy and offline capability.

Released: 2026-02-17