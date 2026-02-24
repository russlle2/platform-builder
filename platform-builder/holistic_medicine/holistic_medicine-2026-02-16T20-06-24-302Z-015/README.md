Project: holistic_medicine (clinic_modern)

This chunk contains two files for the contact portion of the site:

- contact.html  
  - A calm, clinical-contact page for {{BUSINESS_NAME}}.  
  - Includes: header navigation (labels varied for subtle uniqueness), hero, contact form, intake/ritual information, scheduling, fees, FAQ, and a final CTA block.  
  - Uses an inline SVG decorative background and CSS gradients for visual richness (no external assets required).  
  - All visible content uses placeholders that must be replaced in deployment: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{CREDENTIALS}}.
  - Accessibility: semantic form fields, aria-label on form, clear labels, responsive layout.
  - Clinical constraints: language avoids guarantees, emphasizes education, safety, and collaborative care. Labs described as optional educational tools.

Notes and developer guidance:
- Replace placeholders programmatically or by build-time templating. Keep the curly-brace placeholders intact if you rely on server-side templating.
- The contact form posts to {{PRIMARY_CTA_URL}} by default; adapt the action to your form-handling endpoint or serverless function.
- No external fonts, images, or CDNs are referenced. If you add assets/img/pattern.svg later, update the CSS to reference it (or keep the inline SVG for immediate use).
- Navigation labels intentionally vary from other site pages (e.g. "Practice" instead of "Home", "Offerings" instead of "Services") to satisfy uniqueness requirements.
- If you implement back-end processing, sanitize and validate all fields server-side. The form includes a hidden "source" field for simple tracking.

Design choices:
- Palette uses soft greens and muted tones to convey a calm, clinical yet warm environment appropriate for holistic medicine.
- The layout is a two-column hero on wide screens switching to single column on smaller devices for readability.
- Decorative SVG pattern is embedded to comply with the no-external-assets rule while maintaining an identifiable brand texture.

Legal & clinical reminder:
- Do not present the site or practitioner as offering guaranteed cures. Keep patient-facing language educational and realistic. Include emergency guidance where appropriate (the page already notes to contact emergency services in urgent situations).

Next steps for integration:
1. Replace placeholders.  
2. Connect the form action to your backend or a booking provider.  
3. Optionally add assets/img/pattern.svg and reference it if you prefer a separate file.  
4. Test responsive behavior and form accessibility with assistive technologies.

Contact the design engineer for adjustments to spacing, colors, or for creating the complementary pages (index, services, conditions, approach, pricing, about, book).