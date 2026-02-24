# Contact page — {{BUSINESS_NAME}}

This chunk contains the contact page (contact.html) and this README. It is a self-contained contact + exploration page intended for local use and to be included with the rest of the site pages.

Files
- contact.html — full HTML page with inline CSS, JS, and SVG. Placeholders remain for runtime substitution: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Key features implemented
- Interactive Aroma Wheel
  - An inline SVG wheel split into three sectors (top / middle / base).
  - Hover or tap legend buttons to reveal lists of example notes and safety reminders in the notes panel.
  - Designed to be touch-friendly and accessible (aria labels, tab interaction).

- Proof Gallery (rotating testimonials + credibility badges)
  - Testimonials rotate automatically every 5 seconds with fade/slide animation.
  - Credibility badges on the side show a tooltip on hover/touch with clarifying text (e.g., practitioner standards, dilution guidance).

- Contact form
  - Simple client-side handler validates name and email and shows a local confirmation message.
  - Copy-email button uses the Clipboard API to copy the placeholder email.

- Safety-forward FAQ
  - Includes clear, non-medical language: uses "may support" phrasing and outlines patch testing, dilution ranges, pets, and pregnancy notes.

Accessibility & safety notes
- The page avoids medical claims and uses cautious language. Any therapeutic wording is prefaced as supportive and not diagnostic.
- Safety guidance (patch test, dilution, pregnancy/pet disclosure) is included in the FAQ and near the aroma wheel.
- Elements include aria attributes (live regions for testimonials and form status).

Customization
- Replace the placeholders with real values (search/replace of {{PLACEHOLDER}} tokens).
- If you want the contact form to submit to your server, update the form element action and method and remove the client-only handler.
- The color tokens are in the :root CSS section; tweak to match brand palette.

Notes for integration
- This file expects to live alongside other pages: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html.
- Navigation labels are intentionally different from other templates: Home, Offerings, Mixes, Store, Plans, Story, Book, Connect.

Local testing
1. Save contact.html to your local project.
2. Open it in a browser (double click or use a local static server).
3. Validate JS features: hover legend buttons to see the aroma notes, watch testimonials rotate, hover badges for tooltips, and submit the contact form to see the confirmation.

Developer notes
- All visuals are CSS + inline SVG; there are no external assets or fonts required.
- If you need to extract the SVG pattern as a separate asset file later, copy the <svg> block from the wheel area and save it as assets/img/pattern.svg — ensure to update references.

License & safety
- This deliverable is a UI prototype. It does not replace professional medical advice. Always include a clear disclaimer when used in public sites.

If you need a variant with a downloadable asset for the SVG pattern or a server-backed contact endpoint, tell me which server stack to wire to and I will prepare an update.