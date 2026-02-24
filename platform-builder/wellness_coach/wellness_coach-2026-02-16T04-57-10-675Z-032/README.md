# {{BUSINESS_NAME}} — Contact page

This chunk includes the contact page and a short README for the wellness coach site built with the `aura_editorial` layout and a gentle therapist voice.

Files included in this bundle:
- contact.html — Full contact page that also surfaces the required site sections (hero, social_proof, benefits, process, faq, lead_magnet, cta) so the pack ripples to other pages.

Placeholders used (replace these during deployment):
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

Notes for developers/designers:
- No external assets or CDNs are used. The global assets (SVGs) should be present at assets/img/hero.svg, assets/img/avatar.svg, and assets/img/pattern.svg elsewhere in the project.
- The contact form posts to "{{PRIMARY_CTA_URL}}/contact" and the lead magnet posts to "{{PRIMARY_CTA_URL}}/lead" — adapt endpoints to your backend or form service.
- The style is intentionally editorial: high contrast, strong typographic scale, and layered card surfaces. Adjust CSS variables at the top of the file to tune color, radius, or maximum width.
- Accessibility: the form uses labels and sensible structure; ensure server-side validation and spam protection as needed (honeypot, CAPTCHA, or back-end verification).

Integration checklist:
- Replace placeholders with real values (or use your templating engine).
- Ensure assets/img/*.svg exist and are unique per project rules.
- Hook the form endpoints to an email service or CRM; preserve GDPR-compliant consent flows where required.

If you need alternate versions (lighter palette, minimal layout, or translations), ask for a custom variant and specify which parts should change.