# wellness_coach-2026-02-16T05-00-34-659Z-033 (clinic_modern)

This chunk contains the contact page and a brief README for the clinic_modern wellness coach template.

Files included:
- contact.html  -- The contact page. Contains a contact form, details for phone & email, coach avatar, an illustrative map area and a small FAQ. It references the local SVG assets at assets/img/pattern.svg (and expects assets/img/hero.svg and assets/img/avatar.svg to exist elsewhere in the project).

Placeholders present in templates (replace these during deployment):
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

Notes for implementers:
- The contact form posts to {{PRIMARY_CTA_URL}}. Update action if you have a specific endpoint or form handler.
- No external fonts or CDNs are used. The stylesheet is inline and built for a calm, clinical grid layout consistent with "clinic_modern".
- Accessibility: basic labels are provided. Validate server-side and add CSRF protections as needed.
- Assets: the page references local SVGs under assets/img/. Ensure the following are present in the project root assets folder:
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg

Customization hints:
- Tone: voiceFamily is "coach_friend". Keep copy energetic, approachable, and outcome-focused.
- Programs/Pricing/Testimonials pages should carry the required sections (hero, story, framework, programs, pricing, testimonials, cta) on the index and be reflected across pages for cohesion.
- Update meta description and title tags for SEO.

Integration:
- This contact page links to other pages in the bundle (index.html, about.html, programs.html, pricing.html, testimonials.html, book.html) — ensure those files are present in your build.

Legal & content guidance:
- The copy avoids medical claims. Keep program language focused on habits, goals, and coaching outcomes.

If you need additional pages, SVGs, or a form processor example, request the next chunk with the relevant assets or server-side integration notes.