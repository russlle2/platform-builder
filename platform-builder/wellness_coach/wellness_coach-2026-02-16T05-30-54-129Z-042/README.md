# Contact Page & Guidance for {{BUSINESS_NAME}}

This bundle contains the contact page (contact.html) designed for a wellness coach site using the "bold_playful" layout family and a "gentle_therapist" voice. Fill the placeholders and add the companion assets to make the page production-ready.

Files in this chunk:
- contact.html — Full contact page with hero, social proof, benefits, process, FAQ, lead magnet, and CTA sections.

Placeholders to replace (case-sensitive):
- {{BUSINESS_NAME}} — Your business or practice name.
- {{TAGLINE}} — Short descriptive tagline.
- {{PHONE}} — Primary phone number (tel: link will use this).
- {{EMAIL}} — Contact email (used for mailto: and forms placeholder).
- {{PRIMARY_CTA_LABEL}} — Text for primary CTA (e.g., "Book a Clarity Call").
- {{PRIMARY_CTA_URL}} — URL for primary CTA (e.g., "book.html" or an external booking link).
- {{COACH_NAME}} — Coach's full name.
- {{CREDENTIALS}} — Coach's credentials (e.g., PCC, MA).
- {{CITY}} and {{STATE}} — Locality used in microcopy.

Assets the page references (add to your project):
- assets/img/hero.svg — decorative SVG used in the hero.
- assets/img/avatar.svg — small client avatar/illustration used in social proof.
- assets/img/pattern.svg — optional background pattern referenced by other templates.

Notes & integration details:
- The page uses an inline stylesheet for portability; you can extract styles to a global CSS file while preserving class names.
- The lead magnet form currently has a demo handler that prevents submission and shows an alert. Replace the form action and onsubmit behavior with your email-list provider endpoint (ConvertKit, Mailchimp, Action Network, etc.) or a server endpoint that handles signups.
- The contact form uses a mailto: fallback for static sites; for reliable submissions use a backend endpoint or a form service (Formspree, Netlify Forms, etc.).
- Accessibility: interactive elements include clear labels, high-contrast CTAs, and a logical heading order. Continue to test with screen readers and keyboard navigation.
- No external fonts or CDNs are used. If you add custom fonts, host them locally or ensure licensing allows web use.

Design choices & behavior:
- Layout family: bold_playful — bright accents, rounded cards, lively CTAs.
- Voice: gentle_therapist — empathetic, encouraging, and practical language.
- Required sections are present and intentionally ordered for a contact page that also surfaces credibility and conversion paths.

Customization tips:
- To change colors, update the CSS :root vars at the top of contact.html.
- To add or remove FAQ items, edit the FAQ section; keep question phrasing concise and reader-focused.
- To add analytics or third-party scripts, place them just before the closing </body> tag and avoid blocking the UI.

Deployment checklist:
- Replace placeholders with real content.
- Add the three SVG assets to assets/img/.
- Configure the lead magnet form action and the contact form handler.
- Verify links between pages (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html).

If you want, I can also generate the matching SVG assets (hero/avatar/pattern) and the remaining site pages with unique headings and complementary designs to complete the full template set.