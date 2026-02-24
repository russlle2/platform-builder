HVAC Premium Template

Overview
- A premium, fully static multi-page website template for HVAC businesses.
- Works offline: no external fonts, images, or CDNs. Uses system font stack and local SVG assets.
- Responsive, accessible, and SEO-optimized. Includes OpenGraph metadata and JSON-LD LocalBusiness schema.

Pages
- index.html — Homepage with hero, services preview, stats, and reviews preview
- services.html — Detailed services (install, repair, IAQ, ductwork, commercial, more)
- pricing.html — Transparent install packages, membership plans, and add-ons
- financing.html — Payment options with process steps and FAQs
- about.html — Story, values, and team
- reviews.html — Testimonials and social proof
- book.html — Accessible booking form with client-side validation
- contact.html — Contact details, message form, and map placeholder

Local assets
- assets/img/avatar-01.svg
- assets/img/hero-abstract.svg
- assets/css/styles.css
- assets/js/main.js

Placeholders
Insert your business details by replacing these placeholders across files:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{ADDRESS}}
- {{CITY}}
- {{STATE}}
- {{ZIP}}
- {{HOURS}}
- {{PRIMARY_CTA_URL}}
- {{PRIMARY_CTA_LABEL}}

Getting started
1) Open the HTML files and replace placeholders with your real business info. Use find/replace for consistency.
2) Customize copy, pricing, and FAQs to match your services and policies.
3) Keep assets local to maintain offline compatibility. If you add images, place them in assets/img and reference with relative paths.
4) Open index.html in your browser to preview. No build step required.

Accessibility
- Semantic headings, explicit labels, and aria-live regions for form feedback
- Keyboard focus styles and skip link for screen reader users
- Sufficient color contrast in both light and dark modes (auto via prefers-color-scheme)

SEO
- Unique <title> and meta descriptions on every page
- OpenGraph tags for rich sharing previews
- JSON-LD schema (HVACBusiness) with contact and address details

Forms
- Forms are client-side only for offline use. Submission is intercepted and a success message is shown.
- Connect to your backend or form service by adding an action URL and removing JavaScript preventDefault if you plan to process submissions.

Customization tips
- Colors and spacing can be tuned via CSS variables in assets/css/styles.css
- Add or remove service cards or pricing packages by duplicating the card markup
- For additional icons or graphics, prefer inline SVGs stored in assets/img

License
- Provided as-is without warranty. You are responsible for content accuracy (pricing, financing terms, licensing, etc.).
