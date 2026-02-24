# Contact page (chunk 4)

This bundle contains two files for the wellness coach site:

- contact.html — the full contact page with local JS-driven interactions
- README.md — this file

Key features included in contact.html:

- A contact form (name, email, city, state, interest, message) that prevents actual submission and shows a friendly acknowledgement (replace handleSubmit with a real endpoint as needed).
- A "Start a quick practice" pocket exercise modal that runs fully in-browser (no external libraries). It includes three practices:
  - Breathing: box-breathing animation/timer with respects for prefers-reduced-motion.
  - Journaling: a short 2-minute timed writing prompt with start/clear controls.
  - Intention setting: quick input saved to localStorage so users can keep a note for the day.
- Scroll-triggered reveal for elements marked with data-reveal, implemented with IntersectionObserver and automatic fallback for users who prefer reduced motion.
- Accessible modal attributes (role=dialog, aria-modal) and keyboard handling (Escape to close). Focus is restored to the triggering element when the modal closes.
- Navigation and footer that fit the rest of the site structure. Placeholders are included for site integration:
  - {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}

Notes for developers:

- Replace the contact form action/handler with your server endpoint or integrate with a form service.
- The modal logic is intentionally lightweight. If you need a full focus trap, consider adding a small utility that enforces focus inside the dialog.
- Visual assets like assets/img/pattern.svg are referenced in the CSS. Ensure the project includes a unique pattern SVG at that path.
- All behavior is local to the page and runs without external assets or fonts.

Accessibility considerations:

- The reveal animation respects prefers-reduced-motion and immediately shows content when reduced motion is requested.
- The breathing experience disables motion-based animation for reduced-motion users and provides a simple timed prompt instead.
- The modal has basic ARIA attributes and closes on Escape. For stricter accessibility compliance, add a full focus trap and label management.

If you need additional pages or assets for the site (pattern SVG, other HTML pages), request the next chunk and include the assets path where asked.