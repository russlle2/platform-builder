# Contact Page (private_practice_therapist)

This chunk contains two files for the lux_gallery-styled private practice therapist site:

- contact.html — The Connect & Schedule page with a form, logistics, privacy and crisis disclaimers, and links to other site pages. Uses inline styles and references local SVGs in assets/img/*.svg (expected in other chunks).

Placeholders present (replace these with your real values):
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

Notes for implementers:
- The contact form posts to {{PRIMARY_CTA_URL}}. Swap this to your form handling endpoint, or integrate with your booking tool.
- The HTML expects three SVG assets in assets/img/: hero.svg, avatar.svg, pattern.svg. These are referenced with relative paths and should be added elsewhere in the project.
- Keep the confidentiality, crisis, and scope language intact and editable by the clinician. These are required for ethical compliance and clarity to clients.
- No external scripts, fonts, or analytics are used — the page is intentionally self-contained and privacy-focused.

Accessibility & UX:
- Form controls are labeled and keyboard-navigable.
- Provide server-side validation for the form and a response flow that respects 48-hour reply timing described on the page.

Styling:
- Designed with a controlled palette and gallery-like SVG elements to match the lux_gallery layout family.
- Adjust colors in the :root if you need to customize the theme.

If you need a version with progressive enhancement (client-side validation or honeypot anti-spam), add minimal unobtrusive scripts and host them locally. Ensure scripts do not interfere with the clinician's confidentiality notes or change the stated response time.