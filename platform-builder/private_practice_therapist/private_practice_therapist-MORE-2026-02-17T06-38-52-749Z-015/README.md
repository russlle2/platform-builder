This chunk contains the Contact page and a brief developer note for the private_practice_therapist layout (chunk 4).

Files included:
- contact.html — self-contained contact page with interactive features.

Interactive features implemented (local JS & HTML only):
- Mood-to-Method selector: four mood buttons update the recommended approach panel and change the CTA label and destination query string. The selection is stored in a hidden input in the contact form.
- Pricing Comparator toggle: a small switch toggles between "monthly" and "package" views; numeric labels animate smoothly using requestAnimationFrame and a cosine easing for a pleasant effect.

Placeholders to replace before production:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes and constraints:
- No external assets or CDNs are referenced. The page references an SVG pattern at assets/img/pattern.svg; include a unique pattern there when assembling the full site.
- The contact form is a demo (no backend). The submit handler prevents default submission and shows a small alert. Replace with your preferred submission endpoint or script.
- Content includes confidentiality, scope boundaries, and a crisis note. Avoid making medical claims or guarantees — the copy is intentionally measured and clinician-voiced.
- Navigation uses a distinct label set and correct links to other pages in the project (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html).

Accessibility & behavior:
- Mood options are buttons for keyboard access and visible focus via native browser outlines.
- The pricing switch uses role="switch" and toggles aria-checked.

Styling & structure:
- All styling is inline within contact.html for portability. Adjust variables in the :root section to change color palette.

Integration tips:
- Provide an assets/img/pattern.svg file with an original pattern to match the rest of the project.
- Replace placeholder values server-side or during your templating build.
- Hook contact form submission to your secure backend or an email service; ensure proper handling of health-related information and HIPAA considerations where applicable.

If you want this page adapted to a specific brand palette or need the form wired to a particular backend (Netlify, Formspree, custom API), tell me which one and I will produce the wired version.