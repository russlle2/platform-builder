Contact page and notes for holistic_medicine site (chunk 4)

Files included in this bundle:
- contact.html — Contact & guided-exercise page with embedded JS and CSS.

What this page contains:
- A simple responsive header and navigation linking to other site pages (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html).
- Hero with contact panel and a short form (no backend). Placeholders left for the site-wide values: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- Sections: social proof (benefits), process, FAQ, CTA — each set with the reveal class for scroll-triggered reveal.
- A guided exercise modal (local JS only) with three modes:
  - Breathing: animated circle that expands/contracts with inhale/hold/exhale phases. Respects prefers-reduced-motion.
  - Journaling: a two-minute free-write timer and a prompt.
  - Intention setting: quick single-line intention with immediate confirmation.
- Accessibility considerations: modal can be closed with Escape, backdrop click, and has aria attributes. prefers-reduced-motion support disables animations and auto-reveals sections.

Behavior & implementation notes:
- Scroll-triggered reveal: implemented with IntersectionObserver; if the user has prefers-reduced-motion: reduce set, elements are shown immediately without animation.
- Guided exercise: entirely client-side. No audio files or external resources are used. The breathing animation uses CSS transforms and JS timers. The journaling timer counts down in-browser.
- Contact form: client-only; submission triggers a friendly alert and clears the form.

Customization & integration:
- Replace placeholders with real values via your templating or build pipeline.
- The hero background references assets/img/pattern.svg; ensure that unique SVG pattern file exists at that path in the final site.

Accessibility & safety notes:
- Exercises are brief, low-intensity, and meant for general relaxation/clarity. They are educational and supportive, not medical treatments. Avoid promising therapeutic outcomes from the exercises.
- The site content follows a supportive educational tone and avoids medical guarantees.

Deployment:
- Drop contact.html into your site root alongside the other pages listed above.
- Ensure assets/img/pattern.svg is provided locally; no external fonts or CDNs are required.

If you want, I can now:
- Produce the matching SVG pattern at assets/img/pattern.svg for the earthy_warm layout.
- Create the remaining pages (index, services, conditions, approach, pricing, about, book) to complete the site bundle with the same voice and layout.
