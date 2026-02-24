This bundle contains the contact page and a short README for the private practice therapist site scaffold.

Files included:
- contact.html — A premium "gallery"-inspired contact page designed for {{BUSINESS_NAME}}. Uses local SVGs located at assets/img/hero.svg, assets/img/avatar.svg, and assets/img/pattern.svg. The layout follows the "lux_gallery" family: spacious panels, restrained color, clear CTAs.

Placeholders to replace before publishing:
- {{BUSINESS_NAME}} — your practice or business name
- {{TAGLINE}} — short tagline to appear under the brand
- {{PHONE}} — primary phone number
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — e.g., "Book a session" or "Request an appointment"
- {{PRIMARY_CTA_URL}} — link or form handler for booking / lead magnet
- {{THERAPIST_NAME}} — clinician name used in footer/branding
- {{LICENSE}} — licensure and credentials text (state license details)
- {{MODALITIES}} — optional: therapeutic modalities offered
- {{CITY}} and {{STATE}} — location information

Developer notes:
- No external assets or fonts are referenced. Replace the placeholder SVG files in assets/img/ with unique local SVGs.
- The contact form posts to {{PRIMARY_CTA_URL}}; edit to match your scheduling endpoint or mail handling. Consider adding server-side validation and spam protection.
- The page includes required clinician disclaimers: confidentiality, crisis guidance, and scope/boundaries. Keep these unchanged unless reviewed by legal or clinical governance.
- Navigation labels are intentionally different across templates; ensure internal links remain accurate when assembling the full site.

Accessibility & privacy:
- Keep the privacy page up to date and link it from the footer.
- For telehealth, ensure compliance with local telepractice regulations and secure client communications.

Design tweaks:
- Colors and sizes are defined via CSS variables in the head. Fork variables to match brand color palette.
- The layout is responsive; the right-hand aside collapses under a 980px width breakpoint.

If you need the other pages (index, about, specialties, approach, fees, faq, book), request the next chunk and I will generate them with matching tone and unique headings.