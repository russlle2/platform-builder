Contact Page (contact.html)

Purpose:
- A warm, earthy-warm designed contact page intended for a private practice therapist.
- Includes clear pathways to connect: phone, email, an inline form, and a direct CTA to the intake / primary action.
- Contains essential therapist realism notes: confidentiality, crisis disclaimer, scope and boundaries.

Files in this chunk:
- contact.html — full page with inline CSS, accessible form markup (no external scripts).

Placeholders to replace (must remain as tokens in templates until build):
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

Design details & behavior:
- Layout follows the "earthy_warm" family: rounded cards, soft gradients, warm accent color (--accent).
- No external assets or CDNs are used. SVGs referenced in the wider project are local (assets/img/hero.svg, avatar.svg, pattern.svg) — ensure those are provided in the completed bundle.
- The contact form uses a simple POST to {{PRIMARY_CTA_URL}}. If you prefer mailto behavior or integration with a serverless endpoint, swap the form action accordingly.

Accessibility & privacy:
- Labels are associated with inputs.
- Short content for testimonials and process to reduce cognitive load.
- Clear crisis disclaimer and confidentiality limits are included. Do not remove these — they are essential for ethical presentation.

How to preview locally:
- Place this file alongside the other site HTML files in a folder and open contact.html in a browser.
- For production, replace the placeholders with real values (or a template engine of your choice) and ensure the form action points to a real intake endpoint.

Customization notes:
- Colors and radii are set in :root for easy adjustment.
- The CTA and the Welcome Guide link both use {{PRIMARY_CTA_URL}} for convenience; you can point the Guide to a direct file (e.g., /assets/welcome-guide.pdf) if you host it locally.

Ethical reminder:
- The language avoids medical claims and frames therapy as supportive. Keep copy consistent with local licensing rules and professional guidelines.