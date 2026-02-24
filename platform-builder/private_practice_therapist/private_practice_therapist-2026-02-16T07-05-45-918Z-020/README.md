# Private Practice Therapist — contact page (aura_editorial)

This bundle contains the contact page template and a brief README for a private practice therapist site. The design follows an "aura_editorial" aesthetic: strong typographic hierarchy, high contrast, and an intentional editorial layout.

Files included in this chunk:
- contact.html — Complete contact page with the required section ripple (hero, values, methods, objections, testimonials, lead_magnet, cta). This page is designed to be linked from index.html and other pages.

Placeholders used (replace these during deployment):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{THERAPIST_NAME}}
- {{LICENSE}}
- {{MODALITIES}}
- {{CITY}}
- {{STATE}}

Notes for integrators / editors:
- The contact page intentionally re-uses and summarizes key sections from the site so visitors can access values, methods, and social proof while contacting the clinician.
- The contact form's action uses the placeholder {{PRIMARY_CTA_URL}}. Replace it with your scheduling endpoint, form handler, or mailto as appropriate.
- No external assets or CDNs are referenced. SVG artwork (assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg) should be provided in the assets/img folder elsewhere in the project; this page assumes those assets exist for the broader site design.

Clinical & legal requirements included on the page:
- Confidentiality note and limits
- Crisis disclaimer (not an emergency service)
- Licensure placeholder
- A scope statement clarifying adult psychotherapy and telehealth/licensure considerations

Accessibility & behavior:
- Use semantic headings and form labels. Ensure server-side handling validates inputs.
- The design is responsive; test the form on small screens.

Customization tips:
- Update the color variables in the <style> block to match brand colors.
- If you use a JS-based scheduler, replace the primary CTA URL with the scheduler link and consider adding data attributes for tracking interactions.
- Keep copy clinically grounded and avoid promises of outcomes.

If you need a matching set of pages (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html) or the SVG assets, request the next chunk and they will be produced with consistent editorial styling and unique section headings per page.