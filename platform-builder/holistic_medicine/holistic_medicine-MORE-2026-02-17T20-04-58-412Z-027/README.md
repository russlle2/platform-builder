# Contact Page (chunk 4)

This bundle contains the contact page and a README for the holistic_medicine site.

Files:
- contact.html — Full standalone contact page. Includes:
  - Responsive header and navigation linking to other pages in the site.
  - Contact form (demo/local submission) using placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
  - Proof Gallery: rotating testimonials and credibility badges with tooltips (pure JS).
  - Pricing Comparator micro-widget: toggles Monthly vs Package with animated number transitions.
  - Educational disclaimer and accessible contact details.

Notes:
- No external assets are required. The header uses an inline SVG pattern for visual interest.
- The contact form is a local demo — replace handleSubmit() to integrate with a backend or form service.
- Placeholders should be replaced by the integrating system.

How to use:
- Drop contact.html into the site folder alongside other pages.
- Ensure other pages referenced in the nav exist (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html).
- Replace placeholders with real values and wire up form submission as needed.

Design/UX:
- Bold, playful layout with a warm storyteller tone.
- Widgets implemented with vanilla JS for portability and easy customization.

License: provided as-is for integration into the holistic_medicine project.
