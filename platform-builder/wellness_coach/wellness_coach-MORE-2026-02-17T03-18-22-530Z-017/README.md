Contact page and notes for the wellness_coach site (chunk 4)

Files included in this chunk:
- contact.html: Contact page with contact form, quick guided practices, and a modal-based "Try it now" guided exercise.

Features implemented locally (no external libraries):
- A small, accessible guided exercise modal with three practice types: breathing, journaling, and intention setting. The modal runs purely in JavaScript and provides simple timed cues and state controls (Start / Stop / Close).
- Scroll-triggered reveal for elements marked with the .reveal class using IntersectionObserver. The feature respects the user's prefers-reduced-motion setting and reveals immediately when reduced motion is requested.
- Minimal client-side form handling: the contact form validates basic input (name and email) and displays a client-side confirmation. No server-side submission is implemented.

Design notes and placeholders:
- The page references a patterned SVG at assets/img/pattern.svg for visual texture. Ensure that file exists in the assets/img folder.
- Replace these placeholders as needed when generating the site:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}

Accessibility and UX:
- Modal is aria-modal and focuses on a control when opened; Escape closes the modal.
- The scroll-reveal respects prefers-reduced-motion so users who request reduced motion are not animated.

Integration:
- Navigation links use the project page names: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html
- The contact form is client-only; integrate with your backend or form handler if you need submission storage or notifications.

Customization:
- Edit the guided exercise sequences inside the inline script if you want different timing or text prompts.
- Styling is inline in contact.html for ease of use; extract into a stylesheet if needed.

Testing tips:
- Click the "Try a guided exercise now" button or any of the quick practice buttons to open the modal.
- Use the Start and Stop buttons to run/stop sequences, and Esc to close.
- Toggle "Reduce motion" in your OS preferences to confirm the reveal animations are disabled.

Chunk: wellness_coach-MORE-2026-02-17T03-18-22-530Z-017
Layout family: split_diagonal
Voice: mystic_modern
Offer model: intensive
Section pack: hero,gallery,what_to_expect,objections,cta

End of README.