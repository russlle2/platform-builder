# Contact page for {{BUSINESS_NAME}} (wellness_coach-MORE-2026-02-17T03-14-42-466Z-016)

This bundle includes two files for chunk 4 of the site build:

- contact.html — Interactive contact page with the following local features:
  - Mood-to-Method selector: pick a mood (Overwhelmed, Restless, Stuck, Energized). The page morphs the recommended approach content and updates the primary CTA label. The selected mood is stored in a hidden input for submission.
  - Pricing Comparator toggle: switch between Monthly and Package pricing; numbers animate to the new values with a smooth counter animation.
  - Local-only form submission demo: intercepts form submit and displays a confirmation alert. Replace with a server endpoint as needed.
  - Accessible-ish controls: toggle buttons are keyboard-focusable and provide basic aria-live updates for the method area.
  - Uses placeholders for site-wide values: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

- README.md — This file.

Notes for integration:
- The page references an SVG pattern concept; the project expects assets/img/pattern.svg elsewhere in the build. No external assets or CDNs are used.
- The contact.html file is self-contained: styling and JS are inline for easy drop-in. Remove or adapt the demo form handler to connect with your backend or email provider.
- Nav links point to the expected site files: index.html, about.html, programs.html, services.html, pricing.html, testimonials.html, book.html, contact.html.

Customization tips:
- Replace placeholder tokens with real values during build/deployment.
- To connect the form, replace the form submit handler with fetch() to your API endpoint.
- Adjust pricing values by editing the data-monthly and data-package attributes on the .price elements.

Design notes:
- The page is intentionally playful and bold: rounded cards, warm accent color, and quick micro-interactions to encourage exploration.
- The Mood-to-Method content prioritizes behavioral frameworks and habit-based steps — no medical claims are made.

If you need the SVG pattern file or additional pages built in this project, request the next chunk.