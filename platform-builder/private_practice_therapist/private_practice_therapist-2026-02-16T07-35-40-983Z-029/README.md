# private_practice_therapist — contact chunk

This bundle contains two files for chunk 4 of the site seed "private_practice_therapist-2026-02-16T07-35-40-983Z-029" with layoutFamily "bold_playful" and voiceFamily "coach_friend".

Files included:
- contact.html — the contact / connect page for the site. Contains a responsive contact form, therapist metadata, quick links to key pages (Programs/Specialties, Approach, Fees, Book) and required clinical notices (confidentiality, crisis disclaimer, scope + boundaries). Uses local SVG assets referenced at assets/img/hero.svg and assets/img/avatar.svg and assets/img/pattern.svg (these are expected to be present in the project's assets folder).
- README.md — this file.

Placeholders used (replace across the site):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{THERAPIST_NAME}}
- {{LICENSE}}
- {{MODALITIES}}
- {{CITY}}
- {{STATE}}

Design notes:
- Layout is "bold_playful": vivid accent colors, rounded geometry, lively CTAs. No external fonts or CDNs are used.
- Tone follows a calm coach/friend voice: supportive, grounded, not making medical guarantees.

Clinical & legal notes present in the page:
- Confidentiality/privacy note about clinical records and limits to confidentiality.
- Crisis disclaimer instructing users to call local emergency services or crisis hotlines for immediate risk.
- Scope and boundaries statement clarifying communication limits and consent to electronic messaging.

How to preview:
1. Ensure the site root contains the other HTML pages referenced by nav: index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html. This chunk provides only contact.html and README.md.
2. Place SVG assets into assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg (unique, local SVGs expected by the template).
3. Open contact.html in a browser (double-click or serve with a static server like `python -m http.server`).

Form behavior:
- The form posts to the URL specified by {{PRIMARY_CTA_URL}}. For local/demo use, leave the placeholder to block actual submission; supply a real endpoint when integrating.
- Client-side script provides simple UX feedback; server-side validation and storage are required for production.

Accessibility & performance:
- Semantic markup and reachable form controls included.
- Images are local SVGs for crisp scaling.

Notes about uniqueness:
- Headings and navigational labels are intentionally distinct from other templates to avoid repetition across pages (e.g., "Connect" used instead of a repetitive "Contact").
- This page references the required section pack (hero, story, framework, programs, pricing, testimonials, cta) by linking to those pages and surfacing short references; the full sections live on the other pages of the site.

If you need edits to tone, structure, or to swap the link labels, tell me which values you'd like changed and I will update the file.