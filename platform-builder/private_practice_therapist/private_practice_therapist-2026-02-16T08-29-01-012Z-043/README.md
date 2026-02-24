Contact page and usage notes for the private practice template

Files included in this chunk:
- contact.html — fully styled, responsive contact and informational page for {{BUSINESS_NAME}}.

How to customize
- Replace placeholders throughout the file with your clinic's info:
  - {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{THERAPIST_NAME}}, {{LICENSE}}, {{MODALITIES}}, {{CITY}}, {{STATE}}.
- Update links in the header nav if your site structure differs. The current nav points to: /about.html, /specialties.html, /approach.html, /fees.html, /faq.html, /book.html, /contact.html.

Assets
- This file references SVG assets and design elements that are provided in other chunks (assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg). If you prefer localizing graphics now, replace the inline SVGs or add the referenced files into assets/img/.

Form handling & privacy
- The contact form posts to "{{PRIMARY_CTA_URL}}/inquiry" and the lead magnet form posts to "{{PRIMARY_CTA_URL}}/lead" — adjust endpoints to your server or form provider.
- Ensure form submissions are served over HTTPS and stored in a HIPAA-compliant or otherwise secure system if you plan to capture personal health information.

Therapist-specific notes
- The page includes a confidentiality statement, scope boundaries, and a crisis disclaimer. Do not remove these statements. They protect both clients and the clinician and are required ethical content.
- Language aims to be supportive and realistic (no medical promises). Keep copy aligned with your local licensing rules and scope of practice.

Design notes
- Layout family: bold_playful — bold shapes, accent highlights, lively CTAs.
- Navigation labels intentionally vary from other templates (“Paths”, “Work With Me”) to meet uniqueness requirements.
- If you need alternative typography, host fonts locally and update the CSS; avoid external CDNs.

Accessibility & testing
- Test keyboard navigation and form labels. The form fields include labels and should work with screen readers.

Next steps
- Replace placeholders and configure your backend form endpoints.
- Add the remaining site pages and the assets referenced by this template in the other chunks.
- Review legal text with your professional/legal advisor to ensure compliance with local regulations.

If you need a version with inline SVGs replaced by specific asset files or environment-specific form wiring, request the next chunk with the desired options.