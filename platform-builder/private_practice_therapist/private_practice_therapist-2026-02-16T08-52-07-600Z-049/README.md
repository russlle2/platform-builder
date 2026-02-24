Contact page and usage notes for the private practice therapist template.

Files in this chunk:
- contact.html — Fully self-contained contact page designed with the "bold_playful" layout family and a scientist_guide voice. Uses placeholders for live substitution.

Placeholders used (replace these with real values before publishing):
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

Design notes:
- Bold, playful palette with two accent colors (coral and teal) and rounded geometry.
- Layout centers content with a two-column grid (primary form + information sidebar). Breaks to single column on small screens.
- No external assets or fonts are referenced; all graphics are inlined SVG markup to keep this chunk self-contained.

Clinical & legal considerations included on the page:
- Confidentiality note and limits of confidentiality language.
- Crisis disclaimer (clear direction to use emergency services or hotlines for crises).
- Scope/boundaries language about scheduling, texting, and insurance.

Content guidance for implementers:
- Replace placeholders with accurate practice and clinician information.
- Hook the form action to a secure intake handler (HIPAA-compliant systems when required). The form's action currently points to {{PRIMARY_CTA_URL}} as a placeholder.
- Keep the crisis language visible and do not represent therapy as a guaranteed cure. Wording has been intentionally measured and clinician-focused.

Accessibility & performance:
- Semantic headings and labels are included and should be preserved.
- Colors selected for vibrant contrast but ensure WCAG checks for the final palette and text sizes in your implementation.

Next steps for full site assembly:
- This chunk contains only contact.html and a README. To complete the site, integrate this file with the other templates (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html) and add separate asset files if you prefer not to use inline SVGs.
- If you separate SVGs into files, place them at assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg and update references accordingly.

Technical notes:
- No external analytics or fonts are present.
- Replace the placeholder links in the navigation if your site structure differs.

If you need a version of this page exporting the SVGs to files or adapted to a specific CMS or build system, tell me which environment and I will produce the adjusted files.