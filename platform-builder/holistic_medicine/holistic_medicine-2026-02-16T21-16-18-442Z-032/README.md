Contact page for holistic_medicine (zen_minimal / minimal_poetic voice)

Files in this chunk:
- contact.html — a lightweight, accessible contact & events page with inline SVG background and a contact form.

Placeholders to replace:
- {{BUSINESS_NAME}} — the clinic or practice name.
- {{TAGLINE}} — a short descriptive line.
- {{PHONE}} — business phone for click-to-call.
- {{EMAIL}} — contact email used in mailto links and the form.
- {{PRIMARY_CTA_LABEL}} — main call-to-action text (e.g., "Book a consult").
- {{PRIMARY_CTA_URL}} — URL for the primary CTA (e.g., booking link).
- {{CITY}} and {{STATE}} — practice location for footer.
- {{PRACTITIONER_NAME}} and {{CREDENTIALS}} — clinician name and credentials.

Notes for integrators:
- The design intentionally avoids guaranteeing cures and emphasizes education, collaboration, and whole-person care.
- Events/series are described as educational; there are disclaimers about medical urgency and insurance.
- The contact form is client-side only (no backend). Hook form submission to your server or a third-party form endpoint as needed.
- Visuals come from CSS gradients and an inline SVG pattern. If you also include an external asset at assets/img/pattern.svg, the page can reference it later; the inline SVG ensures visual fidelity without external dependencies.

Accessibility & responsiveness:
- Uses semantic elements, details/summary for FAQ, and keyboard-accessible controls.
- Responsive grid collapses to a single column below 880px.

Suggested integrations:
- Wire up form POST to your booking CRM or use a serverless function to forward inquiries.
- Replace placeholder links with real pages: index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html.

Content guidance:
- Keep messaging aligned with holistic medicine ethics: offer education, avoid promises of cures, and advise medical follow-up when necessary.
- Update events section to reflect real dates, capacities, and registration flows.

Seed: 1855211329
Slug: holistic_medicine-2026-02-16T21-16-18-442Z-032
Layout family: zen_minimal
Voice: minimal_poetic
Offer model: events_series

End of file.