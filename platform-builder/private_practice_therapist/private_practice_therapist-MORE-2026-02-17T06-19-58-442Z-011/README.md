Contact page for the private practice therapist template (chunk 4).

Files in this chunk:
- contact.html — The clinician-written contact page with intake form, rotating testimonials, credibility badges with tooltips, and an accordion covering session boundaries and confidentiality. Includes a respectful crisis footer.

Purpose and features:
- Warm, clinician voice that follows professional limits: confidentiality, scope boundaries, and crisis instructions are clearly stated.
- Proof Gallery: rotating testimonials implemented with local JavaScript; credibility badges show brief tooltips on hover/focus.
- Session boundaries + confidentiality accordion: accessible headings with aria attributes; keyboard interaction supported (Enter/Space to toggle).
- Contact form: collects basic intake details and offers an optional "guided workbook" add-on checkbox that represents the retail_addon offer model (no external commerce integration). Form submission is simulated client-side.
- Nav uses an alternate label set: Welcome, My Approach, Areas, Rates, FAQs, Book, Connect.
- No external assets or CDNs are required. The page references assets/img/pattern.svg for a decorative background pattern — ensure that file exists in the assets/img directory for the full visual effect.

Placeholders to replace in the final site build:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility notes:
- Carousel pauses on hover and is controllable with previous/next buttons.
- Badges are keyboard focusable and reveal tooltips on hover or focus.
- Accordion items use aria-expanded state and respond to keyboard events.

Therapist/legal notes:
- No medical claims or guarantees are made.
- Clear mention of limits to confidentiality and instructions for crisis situations are present. The crisis guidance points users to emergency services and to the Suicide & Crisis Lifeline (988) for U.S.-based callers. Modify locale-specific crisis information as appropriate.

Integration tips:
- Hook the contact form into your scheduling or CRM system by replacing the simulated submit handler with an AJAX call to your backend.
- Supply assets/img/pattern.svg with a unique SVG pattern for visual identity.
- Update the placeholders with real practice details.

Design/UX ideas:
- Consider adding server-side validation and reCAPTCHA if needed for production.
- Keep wording consistent across other pages to maintain a coherent therapeutic voice.

End of chunk 4 README.