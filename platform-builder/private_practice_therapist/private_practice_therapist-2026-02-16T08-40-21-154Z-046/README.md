# private_practice_therapist - chunk 4 (contact + notes)

This bundle contains two files for the lux_gallery layout focused on a private practice therapist website.

Files included:
- contact.html — full contact page, self-contained. Includes inline SVG visuals so no external assets are required for display.
- README.md — this file.

Placeholders used (replace these when customizing):
- {{BUSINESS_NAME}} — practice or business name
- {{TAGLINE}} — short descriptor under the name
- {{PHONE}} — primary phone number
- {{EMAIL}} — primary contact email
- {{PRIMARY_CTA_LABEL}} — label for the main call-to-action button
- {{PRIMARY_CTA_URL}} — URL or form action for primary CTA
- {{THERAPIST_NAME}} — clinician name
- {{LICENSE}} — license identifier (e.g., LCSW, PhD)
- {{MODALITIES}} — brief list of therapeutic modalities (e.g., EMDR, CBT)
- {{CITY}} — city
- {{STATE}} — state

Design notes:
- Layout family: lux_gallery — large embedded SVG art, restrained palette, gallery-like sections.
- The contact page intentionally balances visual SVG elements with clear clinical copy: intake logistics, scope/boundaries, confidentiality, and crisis disclaimer.
- No external fonts, analytics, or CDN dependencies are included.

Accessibility and ethical considerations:
- Form fields include labels and required attributes; there is small client-side validation for basic UX.
- Crisis disclaimer present: the page does not replace emergency services. Include local crisis resources or 988 as relevant.
- Confidentiality statement and scope/boundaries language included; these should be reviewed by the clinician for compliance.

Developer notes:
- The contact page embeds three decorative/svg elements inline. In production you may extract them to files at assets/img/hero.svg, assets/img/avatar.svg, and assets/img/pattern.svg for reuse. If you extract them, ensure to update the HTML to reference those local files and keep identical accessibility attributes.
- Navigation links point to the other pages in this site scaffold (index.html, about.html, specialties.html, approach.html, book.html). Ensure those pages are built with varied headings and section order across the site.
- This chunk intentionally varies nav wording (e.g., 'Areas' instead of 'Specialties' or 'Work With Me' vs 'Programs') to meet uniqueness requirements.

Privacy and compliance:
- Review local telehealth and record retention policies before deploying.
- If collecting PHI via forms, ensure transmission and storage meet relevant security standards (TLS, secure server storage). The form action here uses {{PRIMARY_CTA_URL}} as a placeholder for your intake handling endpoint.

Customization checklist before launch:
- Replace all placeholders.
- Add or connect real appointment scheduler or secure intake form handler.
- If you accept insurance, add specifics and a sample superbill flow.
- Review and update licensed disclosure and scope statements for legal accuracy.

If you need the remaining pages or the SVG assets as separate files, request the next chunk and indicate whether you want the SVGs exported as individual files under assets/img/.
