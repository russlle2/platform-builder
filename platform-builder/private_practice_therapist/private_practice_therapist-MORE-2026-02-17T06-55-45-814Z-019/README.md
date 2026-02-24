Contact page and instructions for the private_practice_therapist template (chunk 4).

Files included in this chunk:
- contact.html — Contact page with form, session-boundary accordion, rotating testimonial proof gallery, credibility badges with tooltips, and a respectful crisis footer.

Purpose and highlights:
- Accessible accordion for confidentiality and session boundaries.
- Proof Gallery: rotating testimonials with manual controls and auto-rotation; credibility badges show small tooltips on hover.
- Local JavaScript only; no external assets required. The page references assets/img/pattern.svg for a background pattern (ensure that file exists in the assets folder distributed with the full bundle).
- Placeholders present: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}} — replace these server-side or with your templating system.

Therapist/legal notes included in the page:
- Clear confidentiality summary and explicit limits to confidentiality.
- Note about informed-consent conversation and that this site does not replace emergency services.
- Crisis guidance (general and non-clinical) provided; avoid treating the content as medical advice.

Testing locally:
1. Place this file alongside the rest of the site files (index.html, approach.html, specialties.html, fees.html, faq.html, book.html, about.html).
2. Ensure assets/img/pattern.svg exists (the full bundle includes a unique SVG pattern file).
3. Open contact.html directly in a browser for basic testing. For form submission behavior, set {{PRIMARY_CTA_URL}} to your real endpoint.
4. Interact with the accordion, rotate testimonials with the ◀/▶ buttons, hover badges to see tooltips, and try the form (consent checkbox is required).

Customization notes:
- Update contact details ({{PHONE}}, {{EMAIL}}) and the primary CTA label/URL.
- The VIP day language is intentionally neutral and descriptive; adjust to match your clinical scope and policies.
- The visual style is self-contained in the page CSS; adjust colors at the top of the style block if needed.

Accessibility:
- Buttons and controls are simple, keyboard-focusable elements.
- Accordion is implemented with buttons and progressive enhancement; review for any ARIA additions your project requires.

If you need a variation (e.g., different CTA wording, alternate badge icons, or a version without the pattern background), request edits specifying which parts to change.