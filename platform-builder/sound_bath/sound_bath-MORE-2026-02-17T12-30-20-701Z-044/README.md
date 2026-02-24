Chunk 4 — contact.html and README

Files included:
- contact.html: The contact page for the sound bath site. It includes:
  - Site header and unique navigation labels (Gatherings, Sanctuary, Investment, Story, Questions, Reserve, Connect) linking to the other pages.
  - Hero with an integrated "Sound preference mixer" (gentle / medium / intense). The mixer updates program recommendations locally (no backend).
  - Contact form capturing name, email, phone, location, intensity, and message. The form uses client-side validation and simulates send with a local timeout.
  - Proof Gallery: rotates testimonials automatically and via prev/next controls. Each testimonial shows credibility badges with tooltips (hover reveals badge text).
  - Calendar list + next-event module populated by a small local array.
  - Contraindications section included with responsible guidance about epilepsy, pregnancy, implanted devices, and recommendation to consult a physician.
  - All interactive features implemented in vanilla JS inside the page; no external assets or CDNs.

Design / UX notes:
- Visual approach: mystic_modern voice — clean, calm, slightly otherworldly color palette; rounded cards and subtle glass effects.
- Unique CTA phrasing is used in-site; the site still surfaces the placeholder {{PRIMARY_CTA_LABEL}} in the nav as required.
- Program naming and recommendations are different from previous templates (e.g., "Slow Harbor", "Deep Focus", "Tonal Reset").

Placeholders present (do not replace in this chunk):
- {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}

Integration notes for the rest of the site:
- contact.html links to events.html, private-sessions.html, pricing.html, about.html, faq.html, and book.html. Ensure those pages exist in the project root for navigation to work.
- The page expects no server endpoints; form submission is simulated locally. Replace or wire to your form backend when integrating (see contactForm listener in the script).

Accessibility & legal:
- Tooltips are simple CSS :hover generated; consider adding aria attributes if you need them for screen reader support.
- Contraindications are included as an informational notice only — they are not medical advice.

Developer tips:
- To reuse the mosaic badges or modify the testimonial set, edit the testimonials array in the script near the "Testimonials rotating gallery" comment.
- To change mixer recommendations, edit the mixers map at the top of the mixer IIFE.

End of chunk 4.