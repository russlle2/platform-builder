Project: Holistic / Integrative Medicine site (layout: bold_playful, tone: clinical_calm)

This chunk contains two files for the build:
- contact.html — contact and booking page, responsive, accessible, and styled with CSS + inline SVG pattern for decorative background.

Placeholders to replace in templates (keep the double-braced tokens):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Notes & guidance:
- The site voice is clinical and calm: focus on education, whole-person care, and realistic outcomes. Avoid claiming cures or guarantees.
- The contact form posts to {{PRIMARY_CTA_URL}}; hook this to your booking endpoint or form processor. Basic client-side validation is included. Ensure server-side validation as well.
- Hybrid offer model: language in the contact page references in-person and telehealth. Membership and fee-for-service options are mentioned in non-committal terms.
- Accessibility: form fields include labels, required attributes, and clear call-to-action. Ensure color contrast meets your WCAG targets when replacing brand colors.

SVG and assets:
- For visual richness the header/footer include an inline SVG pattern. If you prefer to centralize assets, extract the <svg> block from contact.html and save as assets/img/pattern.svg, then reference it as a background image in CSS.

Privacy & clinical disclaimers:
- The contact page includes copy reminding users this is not an emergency line and that integrative approaches are educational/supportive. Keep similar tone across other pages.

Development tips:
- Nav labels are intentionally varied to keep templates distinct across the site: "How we work" vs "Approach" vs "What we treat" on other pages.
- Copy in other pages should include the required sections (hero, story, framework, offers, pricing, testimonials, cta) and respect the holistic medicine rules (no guaranteed cures, list conditions with disclaimers where appropriate).

Deployment:
- This is a static HTML fragment ready to drop into a site. Replace placeholders, add any server handlers for the form action, and include analytics or privacy tooling as required by your organization.

If you need complementary files (SVG extracted to assets, alternate color schemes, or a JS form handler), request the next chunk and specify which assets to include.