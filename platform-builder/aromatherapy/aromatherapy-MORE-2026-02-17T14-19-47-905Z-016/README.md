# Contact page and README

This bundle contains the contact page and documentation for an aromatherapy practice site.

Files included in this chunk:
- contact.html — complete contact page with a quick blend builder, a guided exercise modal, FAQ/safety notes, social proof, and a contact form. Uses placeholders for site-specific info: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

How to use:
1. Place contact.html in your site root (or the routes used by your site). Ensure the other pages listed in the project exist: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html.
2. Provide the asset: assets/img/pattern.svg (the page references this path for a background pattern). No external fonts or CDNs are required.
3. Replace placeholder tokens with your business details in your build process or templating engine.

Features implemented in contact.html:
- Responsive header and navigation (unique label set with "Connect" instead of "Contact").
- Contact form with minimal client-side handling; shows a confirmation alert on submit.
- Quick Blend Builder: choose a vibe and target use to get a suggested blend, safe dilution guidance, and a copyable blend card. Safety-first copy: suggestions only, includes patch-test/pregnancy/pet notes.
- Guided exercise modal: A short, timed practice (breathing, journaling, intention-setting). Runs purely in local JS with basic timing, start/pause controls, and keyboard accessibility (Esc to close, light focus trap).
- FAQ section includes dilution, patch testing, pregnancy/medication, and pet notes to align with aromatherapy safety guidance.

Accessibility & safety notes:
- Modal uses aria-hidden toggling and is dismissible via keyboard.
- All aromatherapy guidance uses non-medical language ("may support") and includes clear recommendations to consult providers when relevant.

Customization suggestions:
- Replace the pattern.svg with a unique SVG to keep the visual identity consistent.
- Integrate the contact form with your backend or an email service by replacing the client-side alert with an AJAX call.
- Expand blend recipes and safety checks as needed for your practice; consider adding a checkbox on the form for client consent to safety terms.

License: this is a design and front-end code snippet intended for use in your site. Adjust copy and safety guidance with your own professional review as needed.
