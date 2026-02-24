This folder contains the contact page and a README for the private practice therapist site template.

Files included:
- contact.html — Contact / Connect page built in a "lux_gallery" presentation. Uses placeholders for quick templating.

Placeholders to replace prior to publishing:
- {{BUSINESS_NAME}} — practice or business name
- {{TAGLINE}} — a short line describing the practice
- {{PHONE}} — primary phone number (format as needed)
- {{EMAIL}} — primary contact email
- {{PRIMARY_CTA_LABEL}} — main call-to-action label (e.g., "Book a Session")
- {{PRIMARY_CTA_URL}} — URL for scheduling or form handling
- {{THERAPIST_NAME}} — clinician name
- {{LICENSE}} — professional license (e.g., LPCC, LCSW, PsyD)
- {{MODALITIES}} — optional: modalities you practice
- {{CITY}} — city where practice is located
- {{STATE}} — state where practice is located

Notes & guidance:
- The contact form actions point to "{{PRIMARY_CTA_URL}}". Replace this with your scheduling link or form endpoint. If you handle forms via email, configure server-side handling or a form service. No external scripts are included.
- Images referenced: assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg. These are expected to live in the assets/img folder of the site. Ensure unique SVGs are placed there.
- Confidentiality & crisis language: the page includes a confidentiality notice and a crisis disclaimer. Do not remove these; update wording to match your local regulations and professional requirements.
- Accessibility: headings and form controls include labels and placeholders, and visual contrast is considered. Review with your accessibility checklist before launching.

Styling & customization:
- Styles are inline in contact.html for portability. You can extract them to a CSS file and adjust variables at the top of the style block (colors, radii, widths).
- The template uses a "lux_gallery" aesthetic—large hero art and soft gradients. Modify the hero image and pattern SVGs to match your brand.

Legal & ethics reminders:
- Avoid making medical or curative claims on public pages. Describe services as supportive, collaborative, and non-guaranteed.
- Provide clear information about limits of confidentiality, crisis resources, and scope of practice.

Deployment:
- This is a static HTML page and can be hosted on any static host (Netlify, Vercel, S3, traditional web host).
- Ensure forms are connected to a secure backend endpoint or a trusted form provider. Avoid sending sensitive clinical information over insecure channels.

If you need another page or a different section ordering, request the next chunk and note which files to prioritize (index, about, specialties, approach, fees, faq, book).