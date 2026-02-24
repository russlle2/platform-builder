# Contact Page — {{BUSINESS_NAME}}

This bundle contains the contact page (contact.html) for the zen_minimal wellness coach site and a README describing usage.

Files in this chunk:
- contact.html — standalone, minimal-contact experience optimized for clarity and conversion.

Design notes:
- Layout family: zen_minimal — lots of white space, restrained type scale, and an ultra-clean grid.
- Voice: scientist_guide — measured, evidence-oriented, practical language to set expectations.
- Required sections ripple: hero (top explanatory panel), myth_vs_truth (compact), pillars, case snapshot, faq, and a clear CTA.
- The page includes inline SVG artwork so no external assets are required in this chunk. In the final project, you can extract these to assets/img/*.svg as desired.

Placeholders used (replace values during templating or deploy-time):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{COACH_NAME}}
- {{CREDENTIALS}}
- {{CITY}}
- {{STATE}}

How to integrate:
- Drop contact.html into your static site root or template renderer.
- Replace placeholders with environment variables or templating engine values.
- The page links to other pages in the site (index.html, about.html, programs.html, pricing.html, testimonials.html, book.html). Keep those files in the same directory for correct navigation.

Accessibility & privacy:
- Form uses standard labels and sensible required fields.
- No tracking or external resources are included in this prototype.

Notes for developers:
- The form handler is a simple JS stub (handleSubmit). Replace with your backend or a third-party form endpoint.
- If you extract inline SVGs to files, update src references accordingly and keep unique file names to avoid collisions across templates.

License: this file is part of the {{BUSINESS_NAME}} design system. Replace all placeholder tokens with your project's real values prior to publishing.