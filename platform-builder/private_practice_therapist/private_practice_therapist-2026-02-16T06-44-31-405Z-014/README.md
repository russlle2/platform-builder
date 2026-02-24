Project: Private Practice Therapist — aura_editorial

Files in this chunk:
- contact.html — the contact and outreach page for the practice.

Purpose
- This chunk provides the contact page (contact.html) styled in an editorial, high-contrast aesthetic suitable for a private practice therapist.
- The contact page includes a form, professional details, short explanatory sections (common misunderstandings, professional pillars, anonymized vignettes), a compact FAQ, and a clear booking CTA.

Placeholders
- The following placeholders appear in the HTML and should be replaced by your templating system or during deployment:
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

Design notes
- Layout family: aura_editorial — bold typography, high contrast, editorial spacing.
- No external fonts, assets or analytics were used. The page references local SVGs expected elsewhere in the bundle: assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg. Ensure these assets are present in the final project assets folder.
- Navigation labels were chosen to be slightly different from default labels to meet uniqueness requirements (e.g., "Who I Am", "Areas", "Begin", "Reach").

Therapist realism & ethical content
- The content avoids medical claims and includes confidentiality and crisis disclaimers, scope boundaries, and professional limits.
- Specialties and clinical language are supportive and non-precision-guaranteeing.
- The page includes guidance for emergencies and mentions record-keeping and privacy.

How to preview
1. Place this file alongside the other site HTML files in the same directory.
2. Ensure referenced SVG assets live at assets/img/avatar.svg (and others when available).
3. Open contact.html in a browser to preview.

Notes for integrators
- The contact form action currently points to {{PRIMARY_CTA_URL}} as a placeholder; replace with your booking endpoint or email-forwarding service as appropriate.
- If you implement server-side form handling, ensure secure transport (HTTPS), proper spam protection, and storage compliant with professional recordkeeping rules.

Accessibility
- Semantic headings, labels, and ARIA where appropriate were used. The color palette is high-contrast; double-check with your brand palette for WCAG compliance.

Next steps
- Add the remaining pages (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html) and three unique SVG assets to complete the site.
- Review and replace placeholders with real practice information and confirm legal/regulatory language with appropriate advisors.

Generated: chunk 4 of site build — private_practice_therapist-2026-02-16T06-44-31-405Z-014