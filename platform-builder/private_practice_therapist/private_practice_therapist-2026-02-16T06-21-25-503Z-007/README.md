This chunk provides the contact page and a README for the private practice therapist site.

Files included in this bundle:
- contact.html: A premium "aura_editorial" styled contact page for {{BUSINESS_NAME}}. It follows the editorial, high-contrast aesthetic with bold typographic hierarchy and an approachable, coach-friendly voice.

Placeholders used (replace throughout):
- {{BUSINESS_NAME}} — practice or clinic name
- {{TAGLINE}} — short descriptive tagline
- {{PHONE}} — clinic phone number (used with tel: link)
- {{EMAIL}} — contact email (used with mailto: link)
- {{PRIMARY_CTA_LABEL}} — primary call-to-action label (e.g., "Request a consult")
- {{PRIMARY_CTA_URL}} — primary CTA URL (form action / schedule link)
- {{THERAPIST_NAME}} — clinician name
- {{LICENSE}} — professional license / credential (e.g., "LCSW" or "PsyD")
- {{MODALITIES}} — modalities offered (e.g., "CBT, EMDR, psychodynamic")
- {{CITY}} and {{STATE}} — location text

Developer notes and integration guidance:
- The contact form posts to "{{PRIMARY_CTA_URL}}/contact" by default. Replace or route this to your secure form handler, CRM, or serverless function. Ensure the endpoint uses HTTPS and respects clinical privacy and record-keeping regulations.
- No external scripts, fonts, or analytics are included. You may add secure, consented analytics if desired, but avoid including identifiable client data. Prefer server-side handling for sensitive fields.
- Images referenced: assets/img/hero.svg expected. This chunk does not include image assets (they belong to other chunks). Keep these files local; do not reference third-party CDNs.

Clinical & compliance notes (content intentionally included on the page):
- The page contains a crisis disclaimer and confidentiality/privacy text. These are intentionally non-medical and ethically grounded. Do not modify them to make guarantees or promises of specific clinical outcomes.
- The copy avoids medical claims and frames therapy as supportive. Keep that tone if editing.

Accessibility & UX:
- Basic ARIA landmarks and semantic headings are provided. Ensure further accessibility testing (keyboard-only navigation, screen reader flow, color contrast checks) in your environment.
- The form uses progressive enhancement. Client-side enhancement is intentionally limited; server-side validation and secure handling are required.

Styling and layout:
- Design follows the aura_editorial layout family (editorial hero, bold typography, dark high-contrast palette).
- To adjust scale or colors, edit the :root variables in the top <style> block.

Further pages required for the full site (not included in this chunk): index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html. Each should reference the same placeholders and assets (assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg) for consistency.

If you need alternate layouts (e.g., earthy_warm, clinic_modern), request a new chunk specifying the layoutFamily and I will produce matching pages with unique headings, different nav labels, and varied section structures while preserving the required sections: hero, story, framework, programs, pricing, testimonials, cta.

Contact for handoff:
- When integrating into a production environment, ensure secure hosting, TLS, and appropriate data retention policies. Update the form action and email placeholders to point to your secure endpoints.

Licensing & attribution:
- Content is provided as-is. Replace placeholder data with your real practice information before publishing.

End of README.