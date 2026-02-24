# {{BUSINESS_NAME}} — Website bundle (earthy_warm)

This chunk contains the contact page and a brief README for the wellness coach site.

Files in this chunk:
- contact.html — Contact page with warm, organic layout. Uses local SVGs: assets/img/avatar.svg and references general site pages.
- README.md — This file.

Placeholders to replace in templates:
- {{BUSINESS_NAME}} — Your business display name.
- {{TAGLINE}} — Short descriptive tagline.
- {{PHONE}} — Business phone (tel link).
- {{EMAIL}} — Contact email.
- {{PRIMARY_CTA_LABEL}} — Primary CTA button label.
- {{PRIMARY_CTA_URL}} — Primary CTA target URL.
- {{COACH_NAME}} — Coach's full name.
- {{CREDENTIALS}} — Short credential string (e.g., PCC, MAPP).
- {{CITY}} — City served.
- {{STATE}} — State served.

Design notes (earthy_warm):
- Warm tones, rounded cards, friendly spacing.
- Contact page includes a form, meta contact blocks, and a small coach profile panel.
- No external assets or CDNs are used; all imagery should be local.

Local assets expected elsewhere in full bundle (ensure these files exist in assets/img/):
- hero.svg
- avatar.svg
- pattern.svg

Behavior and integration:
- The contact form in contact.html simulates submission via JavaScript (static sites should replace this with a real backend or form provider).
- Lead magnet button and download links are placeholders that show an alert; wire these to an email automation or file host as needed.

Accessibility & privacy:
- Form fields are labeled. Keep privacy note visible and ensure compliance with privacy regulations for your region.

Deployment:
- This site is static HTML/CSS/JS and can be hosted on any static host (Netlify, GitHub Pages, Vercel, etc.).
- Replace placeholders before publishing.

If you need alternate layouts, additional pages, or integration snippets for form handling or newsletter signup, ask for the next chunk and indicate which provider (e.g., Formspree, Netlify Forms, HubSpot) you prefer.