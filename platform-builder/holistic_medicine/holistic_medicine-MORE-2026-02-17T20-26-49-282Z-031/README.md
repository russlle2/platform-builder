Contact page and developer notes for chunk 4 of the holistic_medicine site.

Files included in this bundle:
- contact.html : Full contact/connect page with a built-in guided practice modal and scroll-reveal behavior.

What the contact page includes:
- Header/navigation linking to the canonical site pages (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html).
- Hero section with contact prompt and placeholders: {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}.
- Contact form (client-side only; form action is a placeholder).
- Practical details panel with membership links and a short membership note (educational tone — no guarantees).
- A short guided-practice area (breathing, journaling, intention) that opens a modal.

Daring features implemented (local JS only):
- "Try an exercise now" modal with three modes:
  - Guided breathing: paced inhale/exhale cycles with a simple SVG progress indicator and CSS meter. Timing is 4s inhale / 6s exhale by default; cycles are short and adjustable in code.
  - Quick journaling: a 3-minute timer and a writing textarea (client-side only).
  - Intention setting: quick built-in prompts and a free-text intention field.
- Minimal focus handling and Escape-to-close for accessibility.
- Scroll-triggered reveal for sections using IntersectionObserver, with immediate reveal when the user prefers reduced motion (prefers-reduced-motion support).

Accessibility notes:
- All interactive elements are keyboard accessible; modal responds to Escape. Basic focus is moved into the dialog after opening.
- If the user sets prefers-reduced-motion, the page avoids motion-based reveal transitions and exposes content statically.
- The contact page includes a clear emergency disclaimer.

Styling and assets:
- No external fonts, CDNs, or images used in this file. The overall project should include assets/img/pattern.svg elsewhere for background patterns if desired.

How to test locally:
1. Place this file in the project web root or serve the folder with a simple static server (for example: python -m http.server 8000).
2. Open http://localhost:8000/contact.html in a browser.
3. Try the guided practice: click "Try an exercise now" or any of the small practice buttons. Use Escape to close.
4. Test reduced-motion behavior: enable "Reduce motion" in your OS or browser and reload — reveals should be visible immediately with no movement.

Notes for integration:
- Replace the placeholders with your actual business values in your deployment process.
- The contact form is intentionally not wired to a backend; hook the form action or JavaScript as needed for submissions.
- Keep the safety disclaimer visible on clinical/conditions pages (conditions.html file) and avoid medical guarantees across the site.

If you need an additional asset (for example, the unique SVG pattern file assets/img/pattern.svg) included in this chunk, request it and it will be generated in the next bundle. 