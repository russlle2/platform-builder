Chunk 4 — contact page and notes

This bundle contains the contact page (contact.html) for the private practice therapist site and a short README.

Files included:
- contact.html: A self-contained contact & information page that implements:
  - A glass-morphism visual style using local CSS only.
  - Navigation linking to all pages in the site.
  - A contact form (static) that demonstrates the primary call-to-action using the placeholders {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}.
  - A Proof Gallery: rotating testimonials with credibility badges that show tooltips on hover.
  - An accessible accordion for session boundaries, confidentiality, cancellation, and telehealth notes.
  - A respectful crisis footer with clear guidance and limits of email contact.
  - Placeholders to be replaced for business-specific values: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Notes for integrators:
- This is a static template. The contact form prevents a real submit so it can be used safely in development. Replace the form action and remove the preventing script for a real backend integration.
- The proof gallery rotation and accordion are implemented in small, dependency-free JavaScript blocks.
- The page references an SVG background at assets/img/pattern.svg. Ensure that asset is supplied in the assets folder for consistent background visuals.

Clinical & copy notes:
- The content avoids medical claims and guarantees, keeps language supportive and clinician-grounded, and includes confidentiality and limits information as required.
- Do not use manipulative scarcity language; this template uses steady, clear invitation phrasing.

How to preview:
- Drop these files into a local static server root alongside the rest of the site pages and the assets folder, then open contact.html in a browser.