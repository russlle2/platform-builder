Chunk 4 — contact page and notes

Included files:
- contact.html — full contact page for the private practice site. Designed in the "zen_minimal" layout family with a calm, executive coaching voice. Contains: hero, contact form, values, methods, objections, testimonials, lead magnet mention, CTA, privacy & scope statements, and clear crisis disclaimer.

Placeholders to replace in your build pipeline:
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

Notes:
- This chunk references local SVG assets (assets/img/hero.svg). Ensure the assets exist and are unique across templates.
- No external fonts or analytics are used.
- The contact form posts to {{PRIMARY_CTA_URL}}; adapt server handling or form service as needed.
- The content intentionally includes confidentiality, crisis disclaimer, and scope boundaries to meet clinician realism rules.

Integration tips:
- Keep the site-wide header and footer consistent when integrating other pages.
- Lead magnet is referenced as a local PDF at /assets/lead_magnet.pdf; replace or remove as desired.

Legal/ethical: copy should be reviewed by the clinician for accuracy of licensing statements and local regulatory compliance.