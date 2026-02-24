This bundle includes the contact page and usage notes for the holistic_medicine site (chunk 4).

Files in this chunk:
- contact.html  : Contact page + Session Planner widget + accessible scroll reveals
- README.md     : This file

How to view
1. Place this file alongside the rest of the site files (index.html, services.html, etc.).
2. Open contact.html in a browser (no server required).
3. The Session Planner widget is on the right side of the page (or below content on narrow screens).

Features implemented
- Scroll-triggered reveals: Uses IntersectionObserver to reveal elements with the "reveal" class when they enter the viewport. Respects prefers-reduced-motion: if the user prefers reduced motion, all sections become visible immediately and no animations occur.
- Session Planner interactive widget: Lets a visitor build a short, plaintext plan by entering name, goal, focuses, session format, weeks, and free-form notes. The builder composes a human-readable summary, places it in the summary box, and prepares a mailto: link.
- Copy-to-clipboard: The "Copy summary" button uses navigator.clipboard.writeText with a fallback for older environments.

Accessibility notes
- The reveal behavior defers to the prefers-reduced-motion media preference.
- The planner form uses semantic form controls and aria-live on the summary so assistive tech is updated when a summary is generated.
- Buttons and links include descriptive aria labels where appropriate.

Placeholders to replace
- {{BUSINESS_NAME}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Assets
- This page references assets/img/pattern.svg as a decorative background for the hero’s pattern band. Ensure the site includes a unique SVG at that path.

Design notes & constraints
- This page follows a zen_minimal layout with soft contrasts, modest radius, and a two-column hero (falls back to single column on small screens).
- Language avoids medical promises and keeps an educational/supportive tone.
- No external libraries or fonts are used; everything is local and self-contained.

Developer tips
- The planner summary generation is intentionally simple plaintext so it can be copied into an email or saved by users.
- If you need to persist planner drafts locally, add a small localStorage wrapper around the form values.

If you need another page or adjustments to the planner (file export, PDF, or calendar integration), ask and I can add it in the next chunk.