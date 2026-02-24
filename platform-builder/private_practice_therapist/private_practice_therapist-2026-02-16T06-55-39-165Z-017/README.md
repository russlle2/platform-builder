# Contact Page — private_practice_therapist (chunk 4)

This bundle provides the contact page and a short README for the private practice therapist website template.

Files included:
- contact.html — the full contact and intake page with:
  - editorial, high-contrast visual style (aura_editorial)
  - header with navigation to other site pages
  - hero that invites a first conversation
  - intake/contact form (posts to {{PRIMARY_CTA_URL}})
  - confidentiality/privacy note, crisis disclaimer, scope & boundaries
  - quick steps explaining the intake process
  - phone/email contact and visible clinician details ({{THERAPIST_NAME}}, {{LICENSE}}, {{CITY}}, {{STATE}})

Notes and placeholders:
- Keep placeholders intact so the site generator or deploy script can replace them:
  - {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{THERAPIST_NAME}}, {{LICENSE}}, {{MODALITIES}}, {{CITY}}, {{STATE}}
- The form action is wired to {{PRIMARY_CTA_URL}}; you can switch this to a server endpoint or mail handler as needed.

Accessibility and ethics:
- The copy includes an explicit crisis disclaimer and confidentiality note. Do not remove these.
- Content avoids clinical guarantees and remains supportive and realistic.

Design decisions:
- Editorial layout with a two-column hero (content + form) to prioritize clarity and a steady tone.
- Color accents are warm and bright to promote approachability without being playful; typography scale is bold for headings.
- No external fonts, scripts, analytics, or CDNs are used.

Integration tips:
- Ensure assets referenced (assets/img/avatar.svg, assets/img/hero.svg, assets/img/pattern.svg) are present in the project root.
- Wire server-side form handling to the {{PRIMARY_CTA_URL}} route and validate input server-side for privacy and security.
- Adjust contact response timing in copy if your practice response policy differs from "within 48 business hours." 

Privacy & legal:
- Keep a visible privacy statement and emergency resources on public-facing pages.
- Confirm license and scope text aligns with local regulations and professional guidelines.

If you need alternate copy variations (shorter intake, multi-step booking, or simplified contact-only page), I can provide additional versions tuned for different conversion strategies.