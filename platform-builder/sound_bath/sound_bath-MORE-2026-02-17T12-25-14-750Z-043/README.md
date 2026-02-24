Chunk 4 — contact.html

This chunk contains two files:

- contact.html — Contact page for the sound bath site. Includes:
  - Header with navigation to all site pages using alternative labels (Home, Gatherings, Circles, Investment, Story, Answers, Reserve, Connect).
  - Hero with CTA placeholders: {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}.
  - Contact card with placeholders for {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}} and the business placeholders {{BUSINESS_NAME}} and {{TAGLINE}}.
  - A contact form (client-side only) that simulates sending inquiries and enforces local validation.
  - A responsible contraindications disclaimer (pregnancy, epilepsy, pacemaker, severe psychiatric conditions) near the form.
  - A 'Try a short exercise' guided modal implemented entirely in local JavaScript offering three exercises:
    - Breathing focus (pulsing guide and 2-minute timer).
    - Timed journaling (3-minute timed text area with localStorage save).
    - Intention setting (quick selection).
  - Scroll-triggered reveal for elements with the `.reveal` class using IntersectionObserver, with full respect for prefers-reduced-motion (reveals instantly when reduced-motion is set).
  - No external assets or CDNs are used. The page references the project asset path `assets/img/pattern.svg` for a patterned background (unique SVG file expected in another chunk).

- README.md — This file (you are reading it).

Notes for integrators:
- Placeholders must be replaced by your templating engine or a build step before publishing.
- The guided exercises run entirely in the browser; timers and journal saves are local to the user device (no network requests).
- The contact form is intentionally local-only here; hook it into your backend or form provider as needed.
- Accessibility: modal uses aria-hidden toggling and Escape to close; reduced-motion queries disable animations.

Chunk constraints honored:
- Only files requested for this chunk were generated.
- No external images, fonts, or CDNs embedded.
- Unique nav labels and copy are used; prohibited signature phrases were avoided.

Next steps:
- Ensure the assets folder contains the unique SVG pattern at assets/img/pattern.svg so the page background renders as intended.
- Integrate form submission endpoint if server-side handling is required.

Seed: 2894564311
Layout family: earthy_warm
Voice: playful_premium
Offer model: cohort
Section pack used here: hero, contact (plus embedded modal exercise)

