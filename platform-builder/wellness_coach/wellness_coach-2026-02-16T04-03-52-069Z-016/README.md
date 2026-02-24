This chunk contains two files for the wellness coach site focused on the contact experience.

Files included:
- contact.html — Full contact page with hero, contact intake form, coach info, mini-framework, links to programs and pricing, and a mailto fallback for static hosting.
- README.md — This file (you are reading it).

Placeholders to replace (global):
- {{BUSINESS_NAME}} — Your practice or brand name.
- {{TAGLINE}} — Short tagline that appears under the hero heading.
- {{PHONE}} — Clickable phone string (format: +1-555-555-5555 or similar).
- {{EMAIL}} — Primary contact email used for mailto.
- {{PRIMARY_CTA_LABEL}} — Label for the main CTA button (e.g., "Book a Call").
- {{PRIMARY_CTA_URL}} — URL for booking or main CTA.
- {{COACH_NAME}} — Coach's full name.
- {{CREDENTIALS}} — Credentials (e.g., "CPCC, Wellness Coach").
- {{CITY}} and {{STATE}} — Location for the coach.

How the contact form works:
- This is a static-friendly form. On submit it builds a mailto: link prefilled with the form contents and opens the visitor's email client.
- If you have a server or form service (Formspree, Netlify Forms, etc.), replace the JS handler and form attributes with a POST action to your endpoint.

Styling and assets:
- The layout follows the "lux_gallery" family: large visual, gallery-like hero, restrained colors and typographic scale.
- The page references local SVGs located at assets/img/hero.svg and assets/img/avatar.svg and assets/img/pattern.svg. Ensure those files exist in the assets/img folder in the overall project.

Accessibility & content notes:
- All interactive controls use labels. Images include alt text.
- Copy avoids medical claims and emphasizes habits, frameworks, and measurable outcomes per wellness coach guidelines.

Editing tips:
- To update the hero visual, replace assets/img/hero.svg with a unique SVG sized to fill the hero area.
- To change the contact flow to a backend, update the form element and remove the JS mailto fallback.
- Customize the coach card (avatar, credentials, blurbs) to reflect your approach and lead magnet offerings.

Local testing:
- For best results, preview via a local static server (e.g., serve, http-server, or Python's http.server) to ensure relative paths load correctly.

SEO & meta:
- Update the meta description in contact.html to include target keywords such as location + coaching specialty.

If you need additional pages or assets, request the next chunk. This file intentionally keeps external scripts and CDNs out for privacy and portability.