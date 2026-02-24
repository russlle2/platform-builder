This chunk contains the contact page and a short README for the aromatherapy membership site.

Files included:
- contact.html — The contact & engagement page with full layout sections: hero, story, framework, offers, pricing, testimonials, and CTA. It includes:
  - A safety-forward narrative and membership-focused offers.
  - A contact form (no back-end; submission is handled with a front-end stub).
  - Placeholders to be replaced during templating: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{FAVORITE_BLEND}}.
  - Decorative SVG included inline (no external assets). Visual interest is from gradients, subtle shadows, and an embedded SVG background.

Notes for integrators:
- This chunk intentionally avoids external fonts, CDNs, or images. If you add assets, place them in the appropriate assets/ directory.
- The contact form is a UI demo only. Hook the form to your backend endpoint or service by replacing submitForm(e) in the script.
- Content follows aromatherapy safety guidance: it avoids medical claims and prompts for patch tests/dilution and notes about pets and pregnancy. Keep that safety-forward language when updating copy.

Styling & structure:
- Uses CSS custom properties for quick color updates.
- Responsive breakpoints are included for narrow viewports.

Next steps:
- Populate the placeholders with real business data during deployment.
- Connect the contact form to your chosen mailer or CRM.
- Ensure other site pages and assets (pattern.svg) are added by adjacent chunks.

Generated with layoutFamily=aura_editorial and voiceFamily=warm_storyteller.
