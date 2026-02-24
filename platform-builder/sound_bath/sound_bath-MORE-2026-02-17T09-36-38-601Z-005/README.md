Contact page for the sound bath site (chunk 4).

Purpose:
- contact.html is the front-facing contact + intake page for prospective attendees and private clients.
- It includes an interactive sound preference mixer and a rotating "Proof Gallery" of testimonials with credential badges and tooltips.

Files in this chunk:
- contact.html — the full page (HTML, CSS, and local JS). 
- README.md — this file.

Key interactive features (local JS only):
- Sound preference mixer: three choices (gentle, medium, intense) that update visible program recommendations and populate the hidden form field "sound_level". The mixer is keyboard-accessible (Enter / Space) and visually emphasizes the selected recommendation.
- Proof Gallery: cycles through testimonial items every 5s, with manual Prev/Next controls. Credibility badges show short tooltips on hover. All rotation and rendering are done client-side.
- Local contact form: prevents default submit, logs payload to console, shows a local confirmation. The Call button uses the {{PHONE}} placeholder.

Placeholders to be replaced by the build system or server:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility & safety:
- The page includes a clear contraindications section advising users with epilepsy, pacemakers, early pregnancy, recent surgery, or serious psychiatric conditions to consult a medical professional before attending. This is intentionally not a replacement for clinical advice.

Notes for integrators:
- The page references an SVG pattern at assets/img/pattern.svg for background texture. Ensure the asset exists in the site bundle.
- No external fonts or CDNs are used; all styling and scripts are local and self-contained.
- Navigation labels are intentionally different from typical templates (Gather, Calendar, Solo, Investment, Story, Answers, Reserve, Reach) but link to the canonical files: index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html, contact.html.

Testing:
- Toggle the mixer to see recommendation emphasis and observe the hidden form field update.
- Use Prev/Next to step through testimonials or wait for automatic rotation.
- Submit the form to see the local confirmation and console payload.

Design notes:
- Pricing and session names use distinct metaphors (Drop-In, Arc Series, Sanctuary Pass) to differentiate framing from other templates.
- The page order and copy intentionally avoid previously used signature phrases.

If you need a companion asset (pattern SVG) or alternate language variants, request them in the next chunk.