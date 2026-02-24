# contact.html — Chunk 4

This chunk contains two files for the Private Practice Therapist template (layoutFamily: aura_editorial, voiceFamily: spiritual_teacher, programModel: cohort).

Files included in this chunk:
- contact.html — Full editorial-styled contact page that also includes condensed versions of required section pack elements: hero, diagnostic, plan, micro_habits, pricing, and cta.

Placeholders used (replace at deploy-time):
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

Notes for integrators:
- The contact.html page is a self-contained, static page. It uses only local assets references (e.g., assets/img/avatar.svg). Ensure the SVGs exist in the assets/img/ folder created in other chunks and match the filenames: hero.svg, avatar.svg, pattern.svg.
- The contact form is a placeholder: method="post" action="#" and a JavaScript alert on submit. Replace the form action with your backend endpoint or integrate with an email backend or form processor. Do not send protected health information via email without secure systems.
- Accessibility: headings are semantic; color contrast is high to match the aura_editorial aesthetic. Review with your accessibility checklist and add ARIA attributes if integrating dynamic behaviors.

Therapist realism & legal content included:
- Confidentiality note, crisis disclaimer, limits of confidentiality, and practice boundaries are present on the contact page. These are written to be ethically grounded and non-promissory. Review with legal/compliance for your jurisdiction.

Customization tips:
- Update placeholders before publishing.
- Tailor the fee amounts and policies to match the therapist's actual offerings.
- Add server-side handling for the contact form to store submissions securely and send appointment information.

Design rationale:
- Layout follows "aura_editorial": bold typographic scale, high contrast, and an editorial two-column grid that collapses on small screens.
- Voice is contemplative and grounded (spiritual_teacher), but avoids therapeutic guarantees.
- ProgramModel "cohort" is referenced in the pricing area with a cohort offering.

Other pages in the full template set (not included in this chunk): index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html.

If you need the form wired to a specific backend or want alternate CTA text variants, provide the endpoint/CORS details and desired text for assistance.