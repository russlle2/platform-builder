Contact page and micro-interactions for holistic_medicine site

This chunk contains two files:

- contact.html — The contact page with interactive components:
  - Contact form (demo handler) that shows a browser alert on submit.
  - Proof Gallery: rotating testimonials with progress dots and credibility badges that reveal tooltips on hover/focus.
  - Two Pricing Comparator widgets (compact and large) demonstrating a monthly vs package toggle with animated numbers.
  - A small navigation header and footer using placeholders for site values.

- README.md — This file.

Placeholders used (must be replaced during templating):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes and integration:
- The page references a local SVG pattern at assets/img/pattern.svg for the background. Ensure that asset exists in the final bundle.
- All interactions are pure client-side JavaScript: no external services or fonts required.
- The contact form is a front-end demo. Replace handleSubmit with your backend integration as needed.
- The testimonial rotation and pricing animations are intentionally lightweight and accessible (keyboard focus on badges shows tooltips).

Accessibility:
- Badges expose tooltips on hover and focus to support keyboard users.
- Toggle buttons are standard buttons for easy tab/enter access.

Testing:
- Open contact.html in a modern browser. Try the toggle buttons to see animated price transitions and wait for testimonial rotation. Submit the contact form to see the demo alert.

Styling:
- Self-contained CSS within the page. No external fonts or CDNs.

License: use and adapt freely for your project.