Chunk: contact (4/?) for holistic_medicine-2026-02-16T21-47-48-174Z-040

Files in this bundle:
- contact.html  — standalone contact/booking page with hero, story, framework, offers, pricing, testimonials, and CTA sections.
- README.md     — this file.

Purpose
This contact page is designed for a small integrative/holistic medicine practice. It emphasizes education, whole-person care, and shared decision-making. It intentionally avoids promises of cures; language focuses on partnership and guidance.

Placeholders to replace
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

Customization notes
- The contact form's action attribute is {{PRIMARY_CTA_URL}}. Provide a full URL (https://...) for client-side fetch to run; otherwise the form will post traditionally to that path.
- All visuals are self-contained: no external fonts, images or CDNs. The decorative SVG pattern is embedded inline in contact.html (class="pattern").
- If you want an external SVG asset instead, extract the <svg> element into assets/img/pattern.svg and reference it as a background-image in CSS.

Accessibility & behavior
- Native HTML validation is used; progressive enhancement attempts a fetch to the form action when it is a full URL.
- Focus styles are preserved by default system styling; adjust :focus styles in the CSS if you need stronger outlines.

Integrations
- Booking link: update {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}} to point to your booking flow or calendar.
- Email/phone: replace {{EMAIL}} and {{PHONE}} so the contact links become actionable.

Notes about clinical copy
- The page includes a short disclaimer stating this is educational care and not an emergency service. Keep such disclaimers visible when adding or changing content.
- Conditions, approach, and pricing pages are expected elsewhere in the site; links to those pages are provided in the quick links and nav.

Developer tips
- To reuse the pattern elsewhere, copy the SVG block and paste it into other templates to keep consistent visual language but tweak pattern attributes (rotate, color stops) for variety.
- For server-side form handling, accept typical fields: name, email, phone, reason, pref, message. Keep privacy and consent practices in your policy.

License
- This bundle is provided as-is for your project. No external assets are required.

End of README.