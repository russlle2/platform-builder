# Contact Page (contact.html)

This file is the contact page for the wellness coach site built with the "lux_gallery" layout family. It is designed to feel premium, gallery-like, and calm while focusing on outcomes, habits, and coaching frameworks.

How to use
- Place this file at the root of your static site alongside the other HTML pages: index.html, about.html, programs.html, etc.
- Replace placeholders with your real data (simple search/replace):
  - {{BUSINESS_NAME}} — the practice or brand name
  - {{TAGLINE}} — short descriptor under the brand
  - {{PHONE}} — phone number shown for contact
  - {{EMAIL}} — contact email used for mailto links
  - {{PRIMARY_CTA_LABEL}} — main CTA button label (e.g., "Schedule a Call")
  - {{PRIMARY_CTA_URL}} — URL the forms and CTAs should submit to or link to
  - {{COACH_NAME}} — coach's full name
  - {{CREDENTIALS}} — professional credentials (e.g., "M.A., Certified Wellness Coach")
  - {{CITY}} and {{STATE}} — used in localized copy

Assets
- This template references three local SVGs that must be included in the assets/img folder in the project root:
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg

Design notes
- No external fonts or CDNs are used. Styles are written inline in the page to keep this bundle self-contained.
- The contact form posts to {{PRIMARY_CTA_URL}}. You can switch to a server endpoint, a form service, or a mailto action as needed.
- The page includes lead magnet signup, social proof, benefits, a concise process outline, and an FAQ to echo the required site sections.

Accessibility and testing
- Test the form action and mailto links locally. Replace the placeholder email/phone to ensure correct behavior.
- Run a simple static server (for example, Python's `python -m http.server`) and visit /contact.html to preview the layout.

Customization
- Adjust colors in the :root CSS variables at the top of the page to match your brand.
- Update the number and wording of FAQ items to avoid repetition across other pages.

Notes on global consistency
- Navigation labels intentionally vary (e.g., "Paths" vs "Programs") across pages to meet the uniqueness requirement. Keep the file links consistent if you rename pages.

This README is intended to help assemble and preview the contact page quickly. Replace placeholders and add the necessary SVG assets to complete the site bundle.