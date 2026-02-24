Project: {{BUSINESS_NAME}} — wellness_coach

This chunk contains the contact page and a short README. The project follows the "bold_playful" layout family with an executive_coach voice and an intensive program model.

Files in this chunk:
- contact.html  — Full contact experience, compact profile card, lead magnet sign-up, values, methods, objections, testimonials, and a clear CTA. Contains references to local SVG assets: assets/img/hero.svg and assets/img/avatar.svg (ensure these exist in the assets/img folder).

Placeholders used (replace across the project):
- {{BUSINESS_NAME}}  — Your business/brand name
- {{TAGLINE}}       — Short descriptor under the brand
- {{PHONE}}         — Primary phone number
- {{EMAIL}}         — Business contact email
- {{PRIMARY_CTA_LABEL}} — Primary call-to-action label (e.g., "Book a Consult")
- {{PRIMARY_CTA_URL}}   — URL for the primary CTA (booking link, scheduling page)
- {{COACH_NAME}}    — Coach's name
- {{CREDENTIALS}}   — Coach's credentials (e.g., PCC, MSc)
- {{CITY}}          — City for testimonials or location copy
- {{STATE}}         — State for testimonials or location copy

Design notes / structure:
- The contact.html page intentionally ripples the required section pack (hero, values, methods, objections, testimonials, lead_magnet, cta) so visitors landing on Contact still see the core positioning and can navigate to other pages.
- Navigation labels vary slightly from other templates intentionally (e.g., "Paths" for programs, "Offering" for services, "Stories" for testimonials) while linking to canonical page filenames.
- The side-card is sticky on wide viewports so the contact form and contact details remain visible while users scroll the content.

Assets:
- Ensure the project includes unique local SVGs referenced in the template:
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg  (referenced by other templates)

Customization:
- Replace placeholders throughout the project files as part of your build or templating process.
- The contact and magnet forms are intentionally client-side-only stubs (they set user-visible confirmation messages). Connect these to your preferred backend, Zapier, or an email provider form endpoint.

Accessibility & behavior:
- Forms have required attributes and aria-live regions for status messages.
- No external scripts, fonts, or analytics are included in this chunk.

Notes for integration:
- Maintain consistent yet varied headings across other templates to meet uniqueness requirements.
- Keep the intensive program framing across Programs/Services pages and avoid medical claims; focus on habits, frameworks, and outcomes.

If you need additional pages from this bundle (index, about, services, programs, pricing, testimonials, book) or the SVG assets, request the next chunk and I will provide them with matching design voice and uniqueness constraints.