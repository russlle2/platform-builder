Private Practice Therapist — contact page (chunk 4)

Overview:
- This bundle contains the contact page (contact.html) and this README.md for the private practice therapist site.
- Layout family: clinic_modern — crisp grid, calm palette, accessible components.
- Voice: scientist_guide — evidence-aware, measured, practical.

Files included:
- contact.html — complete contact page with form, sidebar summaries that ripple core site sections (hero, myth_vs_truth, pillars, case_studies, faq, cta), contact details placeholders, confidentiality and crisis disclaimers.

Placeholders to replace before deployment:
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

Notes on behavior and content decisions:
- The contact page intentionally echoes key sections from the index (hero, foundational principles, myth vs truth, short case vignette, FAQ teaser, CTA) so visitors arriving directly here still see the program framing.
- The tone avoids clinical guarantees and gives clear safety information: confidentiality limits, privacy note, and an explicit crisis/emergency instruction.
- The contact form posts to {{PRIMARY_CTA_URL}} and collects a minimal intake message; it is framed as a request for availability, not a clinical intake itself.
- Payment & insurance are referenced succinctly; detailed policies should live on fees.html.

Assets expected (not included in this chunk):
- assets/img/hero.svg
- assets/img/avatar.svg
- assets/img/pattern.svg

Accessibility & responsive notes:
- Uses semantic sections and readable color contrast.
- Responsive grid collapses to a single column under 880px.

Integration tips:
- Replace placeholders with the clinician's real values and confirm the form action ({{PRIMARY_CTA_URL}}) points to your scheduling or intake endpoint.
- Ensure privacy policy and consent documents are linked from the footer or a dedicated page.
- If using a CMS, map form fields to your intake workflow and protect submissions with TLS and server-side validation.

Legal/ethical guidance (required):
- Do not present this page as providing emergency care or medical advice.
- Keep confidentiality statements accurate and aligned with your local regulations and licensing board requirements.

End of README.