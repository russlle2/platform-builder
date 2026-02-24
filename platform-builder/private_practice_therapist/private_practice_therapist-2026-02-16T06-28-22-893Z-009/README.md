This chunk contains the contact page and guidance for the private practice therapist site.

Files included:
- contact.html — A minimal, zen-styled contact and information page. Contains the following sections: hero, myths vs truth (clarity), foundational pillars, anonymized case notes, FAQ, contact form, and legal/privacy & crisis disclaimers. The required section pack (hero, myth_vs_truth, pillars, case_studies, faq, cta) is present and intentionally echoes across pages for consistent UX.

Placeholders to replace in your deployment (keep curly braces intact):
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
- Layout family: zen_minimal — lots of whitespace, calm scale, restrained color.
- Voice: scientist_guide — evidence-informed, clear, non-hyperbolic clinical tone.

Accessibility & realistic practice guidance:
- The page includes a confidentiality/privacy note, a crisis disclaimer, and a clear scope statement. These should remain visible and unaltered for ethical transparency.
- Do not present therapy as a guarantee; language is intentionally supportive and process-oriented.

Assets:
- contact.html references local SVGs: assets/img/hero.svg and assets/img/avatar.svg. Ensure those files exist in the site assets folder produced by other chunks.

Customization:
- Update placeholders with your practice details.
- PRIMARY_CTA_URL is used as the form action and CTA target — set it to your intake endpoint or booking URL.
- If you connect a backend to receive form submissions, secure the endpoint and honor confidentiality best practices.

Technical:
- No external fonts, CDNs, or analytics included.
- Minimal client-side validation is present; enhance server-side validation for production.

Ethical reminder:
- This template is not a substitute for clinical judgment. Keep license and scope details up to date, and include relevant jurisdictional disclosures where required.