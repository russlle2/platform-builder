This bundle contains the contact page and a short README for the private practice therapist template (layoutFamily: zen_minimal).

Files included:
- contact.html — Minimal, accessible contact page designed for a private practice therapist. It includes:
  - A compact hero with a calm illustration (assets/img/hero.svg).
  - A full contact form and sidebar with therapist details and privacy notes (avatar & pattern SVGs referenced).
  - Rippled mini-sections that mirror the main site's required sections (story, framework, programs, pricing, testimonials, CTA) so these topics are discoverable from multiple pages.
  - A short JS snippet that posts the form to {{PRIMARY_CTA_URL}}; replace that placeholder with your real endpoint or remove the fetch and set up server-side handling.
  - Prominent confidentiality and crisis disclaimers. Use language ethically and do not present guarantees of outcomes.

Placeholders to replace in the files:
- {{BUSINESS_NAME}} — practice or business name
- {{TAGLINE}} — short descriptor
- {{PHONE}} — primary phone number
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — text for primary CTA button (e.g., "Send message" or "Request consult")
- {{PRIMARY_CTA_URL}} — URL or endpoint to receive form submissions
- {{THERAPIST_NAME}} — clinician name
- {{LICENSE}} — license and credential line (e.g., "LCSW", "LPCC")
- {{MODALITIES}} — brief modality list (e.g., "CBT, EMDR, relational therapy")
- {{CITY}} and {{STATE}} — location

Assets:
- The page references these local SVGs. Provide unique files in the same folder structure:
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg

Design notes:
- Layout uses the zen_minimal family: generous whitespace, limited color palette, system fonts only.
- Navigation labels are intentionally varied (Practice, Meet, Areas, Method, Investment, Answers, Schedule, Connect) so each page in the full site can maintain distinct wording.

Privacy & clinical notes (do not remove):
- The site includes a confidentiality notice and a crisis disclaimer. Replace or extend these statements according to your local regulations and practice policies.
- This template is not a substitute for clinical judgment. It should not make unsubstantiated medical claims.

Implementation tips:
- Replace placeholders in the file before deploying.
- If you need to collect payment or process insurance, handle that server-side and store PHI securely according to applicable laws (HIPAA or local equivalents).
- Test the contact form by replacing {{PRIMARY_CTA_URL}} with a working endpoint. If you do not have a backend, consider linking the button to your booking page (book.html) instead.

Accessibility:
- The form uses labels and simple semantic structure. Keep contrast and focus styles when customizing.

If you need additional pages or SVGs generated to complete the full site (index, about, specialties, approach, fees, faq, book), ask for the next chunk and note any variations you'd like in headings, program names, or pricing frames.