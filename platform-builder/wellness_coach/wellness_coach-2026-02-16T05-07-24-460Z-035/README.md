# wellness_coach-2026-02-16T05-07-24-460Z-035

This bundle chunk includes the Contact page and a README for the wellness coach site built with the clinic_modern layout and a spiritual_teacher voice.

Files in this chunk:
- contact.html — Full contact page with condensed versions of required site sections so those elements ripple outside the index: hero, diagnostic, plan, micro_habits, pricing, and cta. The page is intentionally modular so it can be used as a landing/contact hub.

Placeholders used (replace these server-side or during build):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{COACH_NAME}}
- {{CREDENTIALS}}
- {{CITY}}
- {{STATE}}

Design notes:
- Layout family: clinic_modern — crisp grid, calm palette, clinical-but-warm components.
- Voice family: spiritual_teacher — compassionate, slightly ceremonial wording without medical claims.
- Program model: cohort — pricing and offerings framed as seasonal cohorts and membership paths.

Assets referenced (add to project root before deployment):
- assets/img/hero.svg — unique hero motif (used in hero section)
- assets/img/avatar.svg — local avatar image
- assets/img/pattern.svg — decorative pattern used in the sidebar

Accessibility & behavior:
- Form submissions in contact.html currently use inline JS alerts for demonstration; wire them to your backend endpoints or form service.
- No external fonts, CDNs, or analytics are included in this chunk per spec.

Developer tips:
- Maintain unique headings and nav labels across pages to satisfy uniqueness requirements.
- Ensure the SVG asset files are unique and stored at the paths above.
- Keep the replacement of placeholders consistent during build or templating.

If you need additional pages (index, about, programs, pricing, testimonials, book, services) or the SVG assets, request the next chunk and they will be generated with matching design language and unique content.