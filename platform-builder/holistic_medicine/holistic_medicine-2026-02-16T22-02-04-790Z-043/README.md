Project chunk: contact + README

Files included:
- contact.html — a responsive, accessible contact page designed for the holistic / integrative medicine site.

Placeholders to replace in templates:
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
- Layout family: split_diagonal — the hero uses a soft diagonal gradient band to suggest "two-sided" care: listening + practical steps.
- Voice: warm_storyteller — copy is gentle, narratively framed, avoids medical promises and focuses on education and whole-person planning.
- Offer model: membership — membership is mentioned as optional and described as ongoing support; no claims of cures are made.
- Visual richness uses CSS gradients and references a unique SVG pattern at /assets/img/pattern.svg (please include assets/img/pattern.svg in your final build). No external fonts or CDNs are required.

Sections included on contact.html (meets required section pack for this chunk):
- hero (split diagonal visual + quick connect form + CTA)
- social_proof (testimonials and member benefits)
- benefits (three clear benefits)
- process (intake, plan, follow-up steps)
- faq (three common Qs with educational answers and disclaimers)
- lead_magnet (email capture for a short guide)
- cta (membership CTA + primary CTA in header)

Accessibility & behavior:
- Forms use labels and simple HTML controls.
- The page avoids auto-playing media.
- Small JS only sets the current year; form actions point to placeholders (/submit-contact and /subscribe). Replace actions with real endpoints or connect to your backend.

Notes for integration:
- Update the placeholders before deployment.
- Ensure assets/img/pattern.svg is present and unique per site to satisfy the uniqueness requirement.
- Keep privacy language and disclaimers intact: the copy intentionally avoids guaranteeing outcomes and describes services as educational and supportive.

Customization tips:
- Tweak color variables in the :root block to match brand colors.
- Replace the inline logo mark ("HM") with an SVG or image if available; keep the square container for consistent layout.
- If you add server-side handling for forms, validate input and respond with accessible success messages.

Developer hints:
- The hero split effect is achieved with an ::before gradient layer and the overall page background referencing the pattern SVG. For an alternate diagonal, adjust transform:rotate on .hero::before.
- To wire the membership CTA to a gated flow, point {{PRIMARY_CTA_URL}} to the membership signup or booking page.

Licensing & content:
- The page text is tailored for holistic_medicine context. Do not present educational content as medical advice. For clinical material, include appropriate disclaimers and clinician review.

If you need the SVG pattern (assets/img/pattern.svg) or additional site pages (index, services, approach, conditions, pricing, about, book), request the next chunk and indicate preferred color palette or practitioner portrait assets.
