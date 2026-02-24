Contact page for the wellness coach site (chunk 4).

Files included in this chunk:
- contact.html: The contact and connective experience page. Implements an in-page guided micro-exercise modal, scroll-triggered reveals, and a lightweight contact form.

Key behaviors and notes:
- Placeholders used (do not replace in this file):
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}

- Visual assets:
  - The page references assets/img/pattern.svg as a background. That asset is expected to be provided in another chunk (unique SVG pattern per project requirement).

- Interaction features implemented locally (no external libs):
  1) Guided exercise modal ('Try it now')
     - Modes: breathing, journaling, intention setting.
     - Durations: 1/2/3 minutes.
     - Uses requestTiming via setInterval and DOM updates to animate a pulse for breathing (disabled when user prefers reduced motion).
     - Accessible affordances: aria-hidden toggles, role='dialog', visible focusable inputs for journal/intention modes.
     - Start/Stop buttons and visual progress bar show remaining time.
     - For journaling and intention modes the UI injects simple inputs (textarea/input) into the modal exercise area.

  2) Scroll-triggered reveal
     - Elements with the class 'reveal' become visible when they intersect the viewport using IntersectionObserver.
     - Respects prefers-reduced-motion: if reduce is enabled, reveals are applied instantly and animations are suppressed.

- Accessibility & reduced-motion
  - The script checks window.matchMedia('(prefers-reduced-motion: reduce)') to alter behavior:
    - Animations (pulse scaling) are disabled for reduced motion.
    - Reveal transitions are removed and elements are made visible immediately.

- Form behavior
  - The contact form is intercepted on submit (no backend in this chunk). The submit handler prevents default, shows a confirmation alert, and resets the form. Replace this with a real endpoint or mailer integration as needed.

- Navigation
  - The nav uses a different label set than typical templates: Home, About, Offerings, Courses, Rates, Praise, Begin, Connect. Links point to the expected pages in the site: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html.

Developer notes:
- This page intentionally avoids external fonts and CDNs; all visuals are local/CSS-based.
- Keep the assets/img/pattern.svg unique for this project; a separate chunk should supply that file.
- If you add server-side handling for the contact form, remove or modify the client-side preventDefault behavior.
- To test reduced-motion behavior, toggle the OS preference or use devtools to emulate 'prefers-reduced-motion: reduce'.

If you need another chunk (e.g., the SVG asset or other pages), request the next chunk with the asset and remaining pages.