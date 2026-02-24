Contact page for private_practice_therapist

Files in this chunk:
- contact.html — the contact + Session Planner page for the site.

What this page includes:
- Local, self-contained HTML/CSS/JS (no external assets or CDNs referenced).
- A warm, earthy visual palette with a patterned background (assets/img/pattern.svg expected locally).
- Accessible navigation linking to the site pages: index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html.
- A scroll-triggered section reveal effect implemented with IntersectionObserver and respectful handling of prefers-reduced-motion.
- An interactive 'Session Planner' widget that:
  - Collects concerns, goals, time commitment, and tone.
  - Builds a plaintext personalized plan with suggested approaches (non-diagnostic, supportive language).
  - Allows copying the plan to clipboard and opening the native mail client with the plan pre-filled.
- A small contact form that opens the user's mail client with the message (local-only behaviour; no server).
- Confidentiality and crisis guidance included in clinician-authored tone; scope boundaries are stated.

Accessibility & progressive enhancement:
- If users prefer reduced motion, reveal animations are disabled and content is fully visible.
- Buttons, form controls, and output include keyboard focus styles and ARIA-friendly attributes (aria-live for plan output).
- All interactive features use standard browser APIs with fallbacks for clipboard where possible.

Placeholders to replace during templating:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for developers:
- The page references assets/img/pattern.svg for the background pattern; ensure that SVG exists in that path.
- No server-side behavior is implemented. Contact form and email actions use mailto: links. For production, swap to a secure backend if you need message persistence.
- The Session Planner generates plain text only; it is intentionally not a clinical assessment tool and includes a note directing people to crisis resources when needed.

How to preview locally:
- Place this file alongside the rest of the generated site and the assets folder.
- Open contact.html in a browser (double-click file or serve via a static server).

Design & copy considerations:
- Language aims to be clinician-grounded, calm, and non-prescriptive. No medical claims or guarantees are present.
- Section order and program naming intentionally differ from other templates: Clarity Session, Short Track, Exploratory Rhythm are used as framing options here.

If you need additional pages or adjustments to the planner behavior (e.g., save to JSON, integrate with booking flow), ask and I will provide an updated chunk.