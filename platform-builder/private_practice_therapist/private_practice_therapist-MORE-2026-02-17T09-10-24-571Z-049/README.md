Contact page and notes for the private practice template

This chunk contains 2 files:

- contact.html: A self-contained contact and guided-exercise page for a private practice therapist site.

Purpose and features
- Contact form for intake and scheduling with client-side validation and a mailto fallback (no backend required).
- A guided exercise modal offering three short practices (breathing, journaling, intention-setting) implemented in plain JavaScript.
- Scroll-triggered section reveal using IntersectionObserver with support for prefers-reduced-motion: when reduced motion is requested, reveals are applied immediately.
- Clear confidentiality and scope notice plus crisis guidance (no medical guarantees or claims).
- Uses an external pattern referenced at /assets/img/pattern.svg for visual texture (create that asset in the assets/img folder when assembling the full site).

How to test locally
1. Place this file alongside the rest of the site pages (index.html, about.html, etc.).
2. Ensure you add the SVG pattern at: assets/img/pattern.svg (the CSS expects that path).
3. Open contact.html in a browser. Try:
   - Clicking "Begin a guided moment" to open the modal and start a practice.
   - Use the Escape key to close the modal.
   - Click "Request a Conversation" to open your email client with prefilled message (requires a configured mail client).
   - Observe elements revealing as you scroll; test with system "Reduce motion" enabled to confirm immediate reveal.

Placeholders to replace in your build process
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility and behavior notes
- The modal uses aria-hidden and role attributes for basic screen reader support.
- Prefers-reduced-motion is respected: animations/transitions are disabled for users who request reduced motion.
- The guided exercises are intentionally simple, short, and optional; they are not clinical interventions and are labeled as supportive only.

Developer notes
- No external libraries or fonts are used.
- Styling is intentionally self-contained; adjust CSS variables in the :root block for theming.
- The contact form uses a mailto: fallback; replace with your own submission endpoint if a server is available.

Licensing / clinician rules
- Keep language in other pages consistent with scope boundaries and crisis guidance; do not include medical promises or guarantees.

If you need the companion SVG pattern or additional pages from the same template set, request the next chunk or the asset files.