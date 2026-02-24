Contact page and usage notes for the sound bath site (chunk 4).

Files included in this chunk:
- contact.html — The contact page for the site. It contains the following interactive features implemented with local JS and CSS only:
  - Sound preference mixer: choose gentle / medium / intense. The selection updates program recommendations and a small recommendation panel. It also mirrors those recommendations in a compact sidebar.
  - Proof Gallery: rotates testimonials every 6 seconds and displays credibility badges with hover tooltips.
  - Contact form: builds a mailto: link (demo-friendly). The form includes name, email, session type, message, and appends the selected intensity to the email body.
  - Contraindications disclaimer is included and visible near the form.

Placeholders present (fill these when deploying):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design notes:
- layoutFamily: glass_morphism styling uses a minimal glass card look with a subtle SVG background pattern referenced at assets/img/pattern.svg. Provide that asset in the assets/img/ folder (unique SVG pattern for the project).
- voiceFamily: minimal_poetic — concise, quiet language on the page.
- offerModel: hybrid — the page mentions suggested tiers with room for sliding contributions.

How to test locally:
1. Open contact.html in a modern browser.
2. Try clicking the intensity boxes (Gentle / Medium / Intense) and watch recommendations change.
3. Observe the testimonial rotate every 6s; hover badges to read tooltips.
4. Fill the form and submit — it will open your mail client using mailto:{{EMAIL}} with the form contents and chosen intensity.

Notes for integration:
- Navigation links are relative and assume pages: index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html, contact.html.
- Replace placeholders before publishing.
- Add assets/img/pattern.svg (unique SVG) to complete background styling.

Contraindications:
- The page contains a responsible caution about epilepsy, uncontrolled high blood pressure, recent head trauma, and pregnancy-related concerns. Keep that text intact and update per clinical guidance as needed.

Seed: 418759066
Slug: sound_bath-MORE-2026-02-17T11-04-28-475Z-025
Layout family: glass_morphism
Voice family: minimal_poetic
Offer model: hybrid
Sections implemented on this page: hero, social_proof (proof gallery & badges), benefits (brief), process (steps), faq (mini), cta (form + booking links)

End of README.