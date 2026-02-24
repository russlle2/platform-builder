# Contact page — private_practice_therapist

This bundle contains the contact page and documentation for the clinic_modern layout. Files included:

- contact.html — interactive contact page with pricing comparator and mood-to-method selector.

How to run

1. Place `contact.html` in the same folder as the rest of the site (index.html, about.html, etc.).
2. Open `contact.html` in a browser. No server required for basic interactions.

Features implemented

- Pricing Comparator toggle
  - Two modes: Month (recurring) and Package (prepaid). Click the pills to switch.
  - Numbers animate with a subtle easing; values are taken from `data-month` and `data-package` attributes.
  - Accessible state reflected via `aria-selected` on the toggle buttons and `aria-live` on the pricing block.

- Mood-to-Method selector
  - Choose a present state (Overwhelmed / Stuck / Restless / Curious).
  - The recommended approach title, description, and both the side-panel CTA and main CTA update to reflect the selected approach.
  - CTA links include a query fragment to indicate intent (e.g. `?focus=stabilization`).

Content and clinical notes

- Language follows clinician norms: supportive, non-promising, and includes confidentiality and crisis guidance.
- No medical claims are made.

Accessibility and notes

- The markup uses simple ARIA attributes (`role='tablist'`, `aria-selected`, `aria-live`) to support assistive technologies.
- Colors are controlled by CSS variables in the head of the document; you can adjust them to match brand needs.

Customization

- Replace placeholders: `{{BUSINESS_NAME}}`, `{{PHONE}}`, `{{EMAIL}}`, `{{PRIMARY_CTA_LABEL}}`, `{{PRIMARY_CTA_URL}}`, `{{CITY}}`, `{{STATE}}`.
- Pricing values: edit the `data-month` and `data-package` attributes on elements with class `price-figure`.
- Mood mappings: edit the `map` object in the inline script to change titles, descriptions, CTA labels, and href values.

Notes

- No external fonts, CDNs, or images are required.
- The pattern is embedded as inline SVG for visual texture.
- Keep therapy content conservative: do not promise outcomes and include crisis instructions as provided.

If you want this page as a standalone file with a separate CSS and JS, I can split the inline styles and scripts into separate assets for clarity.