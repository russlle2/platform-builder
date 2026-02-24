Contact page for the wellness coach web template (chunk 4)

Files included:
- contact.html — standalone contact page with an embedded Session Planner widget and scroll-triggered reveals.

Features implemented:
- Scroll-triggered reveal animations using IntersectionObserver. Respects prefers-reduced-motion: if user prefers reduced motion, all sections are revealed immediately.
- Session Planner: local, client-side interactive widget that accepts a primary goal, time budget, focus areas, rhythm preference and context. It generates a plain-text plan, which can be copied to clipboard or downloaded as a .txt file.
- Contact form that can be prefilled with the planner summary. Form simulates submission locally (no backend).
- Inline unique SVG pattern used in the header for a warm, earthy visual motif (no external assets or fonts).

Placeholders used (do not replace in this file):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used on this page but reserved across the site)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for integration:
- This page is self-contained and does not rely on external libraries. Styles and scripts are inline for portability.
- If integrating into a larger site, ensure navigation links match your folder structure.
- To wire up the contact form to a real backend, replace the simulated submit handler in the script section with an AJAX/fetch POST.

Accessibility & behavior:
- Interactive elements use clear labels. The planner output is placed in a <pre> with aria-live for screen reader feedback.
- Motion is reduced when the user agent indicates reduced-motion.

Design choices:
- Tone: minimal, poetic, and warm — concise phrases and soft earth tones.
- The Session Planner is purposefully simple: build, copy, and optionally download a plaintext plan for ease of sharing and archiving.

If you need adjustments — alternative CTAs, additional fields, or backend wiring examples — request modifications and include desired endpoints or UX changes.