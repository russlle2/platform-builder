Contact page chunk for private_practice_therapist-2026-02-16T07-58-01-918Z-035

This folder includes the contact.html template and this README. The template is designed for the "bold_playful" layoutFamily and an executive_coach voice.

Files:
- contact.html — Full contact page with embedded decorative SVG graphics (inlined for portability). Includes hero, values, methods, objections, testimonials, lead_magnet, and CTA elements as required.

Placeholders to replace at build time (must remain in templates):
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

Notes for integrators/developers:
- All visual assets are inlined SVGs within contact.html to avoid external files in this chunk. In a complete build you may extract them to assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg — ensure each is unique and not copy/pasted across pages.
- The contact form is intentionally non-functional (demo). Wire up server-side handling or a secure form provider, and ensure transport encryption (HTTPS) and secure storage for submitted data.
- Required therapist realism/legal text is included: confidentiality/privacy note, crisis disclaimer, and scope/boundaries. Review and adapt to local licensing and legal requirements before publishing.
- Navigation labels intentionally vary from other templates (Home, Work, Paths, Rates, Q&A, Connect/Book) to meet uniqueness guidance.

Accessibility & privacy reminders:
- Keep intake and client communication channels private and encrypted.
- Provide accessible contact alternatives when implementing a form (phone/email).
- Review color contrast and adjust if brand tokens change; current palette aims for a premium, playful aesthetic while maintaining legibility.

Developer checklist before production:
- Replace placeholders with real values.
- Integrate scheduling / booking endpoint for PRIMARY_CTA_URL.
- Connect form action to secure backend and add CAPTCHA or spam protection if needed.
- Add appropriate manifest / robots rules as required for SEO.

Design rationale (brief):
- The page prioritizes calm clarity and direct next steps: clear contact options, what to expect on first contact, clinical scope and safety language, and a tangible lead magnet to lower friction for people who want to prepare before their first session.
- Tone follows an executive-coach voice: firm, encouraging, and ethically clear, avoiding medical guarantees.

Chunk notes:
- This generation produces only contact.html and README.md for chunk 4. Other pages (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html) are generated in other chunks and should reference consistent assets and placeholders.
