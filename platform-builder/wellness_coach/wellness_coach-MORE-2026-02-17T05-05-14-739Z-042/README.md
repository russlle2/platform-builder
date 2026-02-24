# Contact Page (chunk 4)

This bundle contains the contact page and usage notes for the wellness coach site.

Files included:
- contact.html — the contact page with an embedded guided micro-practice modal and scroll-reveal behaviors.

Placeholders present in the HTML (replace in your build):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Highlights and features:
- Guided exercise modal (Try it now) with three modes implemented in plain JavaScript:
  - Breathing: visual expanding/contracting circle with inhale/exhale timing (4s inhale / 6s exhale, 3 rounds by default).
  - Journaling: randomized short prompt, editable text area, 5-minute timer and option to download entry as a text file.
  - Intention: quick form to lock an intention and an anchor habit (stored only for the current session).
- Modal runs entirely locally — no external assets, no back-end calls.
- Scroll-triggered reveal: elements with the .reveal-on-scroll class are observed with IntersectionObserver and get the .is-visible class when in view.
  - Respects prefers-reduced-motion: when reduced motion is enabled, reveals are instantaneous and animations are disabled.
- Nav uses a customized label set and maps correctly to the project pages:
  - Home → index.html
  - Meet → about.html
  - Offerings → services.html
  - Calendar → programs.html
  - Rates → pricing.html
  - Voices → testimonials.html
  - Reserve → book.html
  - Connect → contact.html

Notes for integration:
- The page references an SVG pattern at assets/img/pattern.svg for a repeating background. Include the unique SVG in the assets folder when assembling the full site.
- The contact form is demo-only and triggers an alert on submit. Wire it to your server or form service as needed.
- All interactions are implemented without external libraries.

Accessibility & behavior:
- Modal is dismissible via the Close button, clicking outside, or pressing Escape.
- prefers-reduced-motion is honored for the reveal animations.
- Keyboard focus management is simple; if you need stricter focus trapping in the modal, add focus-trap logic when integrating.

Design notes for maintainers:
- Color and radius variables are declared in :root for easy adjustments.
- Animation durations, number of rounds, and journaling timer are defined inline in the script and are easy to tweak.

If you need the matching assets (pattern.svg) or additional pages for this site, request the next chunk(s) and include the seed and layoutFamily for consistency.