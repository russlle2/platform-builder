# {{BUSINESS_NAME}} — Front-end Bundle (lux_gallery)

This bundle contains the contact page and project README for a premium wellness coach website built with a "lux_gallery" layout. The design favors gallery-style sections, generous visual SVGs, and a restrained, polished UI suitable for a coaching practice.

Files included in this chunk
- contact.html — The contact and inquiry page. Contains a sticky contact card, gallery visuals, program snapshot, and an in-page form.

Placeholders
- Replace these placeholders across templates before publishing:
  - {{BUSINESS_NAME}} — your business or brand name
  - {{TAGLINE}} — short descriptive line
  - {{PHONE}} — contact phone number
  - {{EMAIL}} — contact email
  - {{PRIMARY_CTA_LABEL}} — main CTA text (e.g., "Book a Call")
  - {{PRIMARY_CTA_URL}} — full URL for primary CTA
  - {{COACH_NAME}} — coach's name
  - {{CREDENTIALS}} — credentials (e.g., CPT, MPH)
  - {{CITY}} — city served
  - {{STATE}} — state served

Design & Content Notes
- Layout family: lux_gallery — large SVGs, gallery blocks, subtle gradients.
- Voice: coach_friend — warm, energetic, grounded; avoids guru-speak.
- Required sections to ripple across pages: hero, story, framework, programs, pricing, testimonials, cta. This contact page references and links to those areas so the site navigation feels cohesive.
- Lead magnet: reference to a "7-Day Habit Guide" available on the Book page — swap the copy or asset as needed.
- No external fonts, CDNs, or analytics are included. All imagery should be local and referenced from assets/img/.

Assets (place locally in the same project)
- assets/img/hero.svg — large abstract gallery visual
- assets/img/avatar.svg — coach avatar
- assets/img/pattern.svg — decorative pattern used in the gallery grid

Accessibility & UX
- Form fields include labels and appropriate input types.
- Visual contrast is tuned for a dark premium theme; test with real content for sufficient contrast.
- Buttons and interactive elements are keyboard accessible.

Customization Tips
- Update placeholders programmatically or with a templating build step (e.g., simple search-and-replace).
- If you add analytics or external scripts, ensure you follow privacy regulations and disclose tracking.
- Keep the same navigation order and file names to maintain internal links across pages.

Development & Deployment
- Static HTML: works on any static host (GitHub Pages, Netlify, Vercel).
- For multi-page sites, maintain the same assets/ folder structure so links resolve.
- To add server-side form handling, replace the client-side stub in contact.html with a fetch() call to your endpoint and handle errors/validation on the server.

Notes for future chunks
- The other pages (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html) will continue the gallery aesthetic and must each include unique headings, program names, pricing framing, and FAQ wording per the project rules.
- Ensure the assets listed above are created as unique SVGs and added to assets/img/ before final publishing.

Contact
If you need design adjustments or additional templates (e.g., email templates, modal booking flow), request the next chunk and specify the visual or content changes you prefer.