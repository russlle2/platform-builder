This chunk contains the contact page and developer notes for the holistic/integrative clinic template.

Files included:
- contact.html — The contact page users will use to message the clinic, request bookings, or find contact information. It includes:
  - Accessible contact form with client-side validation and a fetch POST to {{PRIMARY_CTA_URL}} when set; falls back to mailto:{{EMAIL}}.
  - Inline decorative SVG background (unique pattern). A reusable copy should be placed at assets/img/pattern.svg for other pages to reference.
  - Header/navigation with varied labels to avoid repetition across templates.
  - Practitioner card using placeholders: {{PRACTITIONER_NAME}} and {{CREDENTIALS}}.
  - Placeholders used throughout: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Editing notes:
- Replace placeholders in the HTML with actual values. Keep the double-curly placeholders if you integrate with a templating system.
- If you provide an endpoint in {{PRIMARY_CTA_URL}}, ensure it accepts POST JSON with Content-Type: application/json. If not provided, the form will open the user's email client.
- A dedicated SVG file is recommended at assets/img/pattern.svg. The inline pattern in contact.html is unique for this template and should be kept in sync if you centralize assets.

Accessibility & legal:
- The page includes aria labels for navigation and status messages for form submission.
- The content avoids medical guarantees and includes an educational / nondisclaimer note. Do not remove the emergency instructions.

Styling & assets:
- Visual richness is implemented with CSS gradients, shadows, and the inline SVG pattern. No external fonts or CDNs are referenced.
- To adapt the color scheme, edit the CSS variables at the top of contact.html.

Deployment:
- Copy contact.html into your build or server static folder. Ensure other pages referenced in navigation (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html) exist alongside it.

If you need alternate contact form handling (e.g., Netlify Forms, Zapier, or a serverless function), replace the fetch call with the appropriate integration and keep the accessibility features intact.