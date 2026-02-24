# private_practice_therapist — contact page chunk

This bundle contains the contact page and a README for the private practice therapist theme (layoutFamily: clinic_modern).

Files included in this chunk:
- contact.html — full contact page built for {{BUSINESS_NAME}} with clinic_modern styling and required site sections present (hero, myth_vs_truth, pillars, case_studies, faq, cta).

Notes and integration instructions:
- Replace placeholders throughout the HTML with real values: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{THERAPIST_NAME}}, {{LICENSE}}, {{MODALITIES}}, {{CITY}}, {{STATE}}.
- The page references local SVGs under assets/img/: hero.svg, avatar.svg, pattern.svg. Ensure those are added to the assets folder in the same project root.
- Nav links point to other templates: about.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html. Include those pages in other build chunks to have a complete site.
- Therapy realism: the page includes confidentiality and crisis disclaimers. Do not alter those sections to make medical claims.
- Forms: the contact form currently posts to {{PRIMARY_CTA_URL}}. Swap to your preferred form handler or mail service. Consider adding server-side validation and anti-spam measures.
- Accessibility: basic ARIA labels and semantic markup are included; review contrast and font sizes against your accessibility standards.

Design decisions (clinic_modern):
- Crisp grid, neutral palette with a calm teal accent (adjust via CSS variables at the top of the file).
- Components are modular cards to reflect clinical clarity and calm organization.

License and scope:
- This UI is intended for clinician websites. Maintain ethical and legal standards in content and disclaimers when adapting.

If you need the remaining pages or the image assets generated, request the next chunk and specify any copy or brand color adjustments.