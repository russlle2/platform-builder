Contact page for the holistic_medicine site (layoutFamily=lux_gallery; voiceFamily=clinical_calm).

Files included in this chunk:
- contact.html — complete contact & booking page with hero, ritual, what_to_expect, schedule, pricing summary, FAQ, and CTA form.

Placeholders to replace in templating or build step:
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

Design notes:
- Visual richness provided by inline SVG and layered gradients; no external assets required.
- The page intentionally emphasizes whole-person care and education; it avoids medical guarantees.
- The booking form uses a mailto: action for simple demo workflows; swap action to your booking endpoint or JS handler as needed.

Accessibility & behavior:
- Responsive two-column layout that collapses to a single column under 980px.
- Form controls and semantic headings included for screen readers.

Developer tips:
- If you prefer a separate SVG asset, extract the inline SVG in the .logo into assets/img/pattern.svg and reference via <img> or background-image.
- To hook into a production booking system, replace the form element action and method, and add client-side validation and recaptcha as required.

Legal / clinical disclaimers:
- Keep the brief disclaimer text in the footer. Do not advertise guaranteed cures. Mention labs and referrals as educational suggestions only.

Copyright: Template seeded by "holistic_medicine-2026-02-16T19-58-43-688Z-013".
