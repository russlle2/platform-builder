Contact page and notes for the wellness_coach site (chunk 4)

Files included:
- contact.html  — the Connect page. Contains the contact form, a "Try it now" guided-practice modal, and scroll-reveal behaviors.

Purpose and highlights:
- This page is focused on a low-friction contact flow and an interactive, in-browser practice so visitors can try a micro-habit without leaving the site.
- The modal runs three practice types: breathing, journaling, and intention-setting. All behavior is implemented with vanilla JS (no external libs).
- Sections reveal as the user scrolls. The script respects prefers-reduced-motion: if the user requests reduced motion, reveals are not animated and are shown immediately.
- No external fonts or CDNs are used. Visual texture is achieved with local styles and the project-wide SVG pattern (assets/img/pattern.svg) referenced elsewhere in the project.

Placeholders present in the file (replace when building):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility notes:
- The modal uses aria-modal and role="dialog" and can be closed with the Escape key or by clicking the close button/overlay.
- When prefers-reduced-motion is set, the reveal animations are disabled and content appears without transition.
- Form fields have labels and clear placeholders. The modal content updates focus to the panel when opened.

How to test locally:
1. Drop contact.html into the site root alongside the other pages (index.html, about.html, etc.).
2. Open contact.html in a modern browser (Chromium, Firefox, Safari).
3. Verify navigation links point to the correct filenames.
4. Try each "Start" button under "Try it now":
   - Breathing: starts a short paced cycle. Verify the circle counts and the Stop action cancels the cycle.
   - Mini journaling: choose a prompt, begin the 3:00 timer, then stop or let it finish. The timer text updates each second.
   - Set an intention: entering text and saving stores it in localStorage under "intentions".
5. Scroll the page to confirm sections animate into view. Then enable "Reduce Motion" in your OS and reload; the content should appear immediately without transitions.
6. Submit the contact form (it is a demo — it will not POST to a server). A local alert confirms submission.

Notes for integration:
- The file expects an assets/img/pattern.svg in the project for other pages and site background treatments. Ensure that asset exists and is unique per the project design.
- Replace placeholders in a build step or using your templating system.
- No server-side processing is present for the contact form — integrate with your backend/API as needed.

Design/UX rationale (brief):
- The contact page doubles as a low-commitment funnel: try a micro-practice, then reach out. This aligns with a cohort-based coaching model where prospective clients benefit from experiencing a framework before signing up.
- Practices are intentionally short and scaffolded (clear prompts, short timers) to lower friction and demonstrate frameworks used in cohort work.

If you need an alternate version with server integration examples (fetch POST or form action) or a focus-trap implementation for modal keyboard control, request an update and I will add it.
