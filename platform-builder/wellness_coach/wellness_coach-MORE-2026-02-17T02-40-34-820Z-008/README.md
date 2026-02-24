# Contact page (chunk 4) — wellness_coach-MORE-2026-02-17T02-40-34-820Z-008

This bundle includes the contact page HTML and notes for deployment. It is crafted for a wellness coaching site with a VIP Day offer model and a split_diagonal layout family.

Files in this chunk:
- contact.html — the full contact page, self-contained (CSS/JS inline). Includes a guided exercise modal and scroll reveal behavior.
- README.md — this file (instructions and notes).

Placeholders to replace (must be replaced during site build or templating):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented in contact.html:
- Navigation with unique label set: Home, Philosophy, Offerings, Tracks, Investment, Voices, Book a VIP, Contact.
- A modern contact layout: left content + right sticky contact and booking summary.
- Decorative SVG pattern included inline for immediate visual richness. You may also add a separate asset at assets/img/pattern.svg for progressive enhancement.
- Try it now: a guided exercise modal with three short practices (breath reset, micro-journal, intention setting). Runs purely in local JS, accessible (aria), keyboard-close via Esc, respects prefers-reduced-motion.
- Scroll-triggered reveal for page sections implemented with IntersectionObserver and a reduced-motion fallback that disables animation.
- No external fonts, CDNs, or images (SVG pattern is inline). If you want a separate file, create assets/img/pattern.svg and reference it from CSS if desired.

Accessibility & motion:
- The reveal animations are disabled when the user prefers reduced motion (matchMedia query).
- Modal is marked with role="dialog" and aria-modal; focus moves to the Start button on open.
- Keyboard users can close the modal with Escape.

Behavior notes for integrators:
- The contact form is intentionally simple; adapt validation and form handling to your backend or embed your scheduling link at {{PRIMARY_CTA_URL}}.
- The guided exercise is non-clinical and designed to be a brief centering practice. It uses timers and simple DOM updates — you can extend modes or customize copy.
- If you add a separate SVG file, place it at assets/img/pattern.svg. The page includes an inline pattern so it looks complete without external assets.

Customization tips:
- Swap colors in the :root block inside the contact.html head to match your brand.
- Edit the choices or durations for the guided exercise in the inline script.
- For server-side templates, replace placeholders before serving the file.

Developer notes:
- This chunk intentionally includes only contact.html and README.md. Other pages (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html) are expected to be in other chunks of the project.
- Keep the unique copy and nav labels consistent across other pages for coherence, but ensure at least two other pages change their section order relative to index (project-level requirement).

If you need a different behavior for the modal or additional micro-interactions, request another chunk and specify which page to modify.
