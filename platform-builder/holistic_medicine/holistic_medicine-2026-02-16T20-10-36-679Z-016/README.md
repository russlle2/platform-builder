Contact page and usage notes for the holistic medicine theme (chunk 4).

Files included:
- contact.html — Contact page with hero, myth_vs_truth, pillars, case_notes, faq, and cta sections plus a contact form and office panel.

Placeholders to replace before publishing:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Design notes:
- Visual richness is achieved via an inline SVG background (soft blobs + dot pattern), layered gradients, rounded cards and subtle shadows — no external images or fonts are required.
- The form uses a client-side example handler that redirects to {{PRIMARY_CTA_URL}} after a basic confirmation. Replace or augment with a secure backend endpoint or scheduling integration.

Clinical & compliance reminders:
- Content avoids promises of cures and emphasizes education, collaboration with other providers, and individualized, evidence-informed care.
- If you add patient stories on other pages, anonymize and add a clear disclaimer that results vary and are not guaranteed.

Assets:
- The page includes an inline SVG for the patterned background. If you prefer a separate asset, add a file at assets/img/pattern.svg and update the markup to reference it.

Accessibility & responsiveness:
- The layout is responsive and stacks on narrow viewports. Color contrast favors legibility; adjust variables in the <style> section if you customize branding colors.

Deployment:
- Drop contact.html into the site root alongside the other page templates (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html).
- Ensure server-side handling for contact submissions if you want form data captured beyond the client-side demo.

License: placeholder templates — customize copy and clinical details to reflect local regulations and professional scope of practice.