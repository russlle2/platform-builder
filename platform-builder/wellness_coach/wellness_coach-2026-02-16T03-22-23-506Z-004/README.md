# Contact Page — {{BUSINESS_NAME}}

This chunk contains the contact page and a README for the wellness coach site.

Files included:
- contact.html — a premium, editorial "Connect" page designed for the aura_editorial layout family.

Placeholders used (replace with real values):
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
- Tone: spiritual_teacher (calm, wise, practical). The copy emphasizes micro-habits, frameworks, outcomes and avoids medical claims.
- Sections present: header/navigation, editorial hero with contact form, contact cards, lead magnet subscription, aside with coach portrait & quick links, FAQ snippets, office hours and footer.
- The page uses only inline CSS; no external fonts or assets. The design follows the aura_editorial brief: high contrast, bold typography scale, illuminated accents.

Form behavior:
- The primary form posts to {{PRIMARY_CTA_URL}}. Update that placeholder to point to your form handler or booking URL. The quick "Get it" button for the lead magnet is non-functional and intended to be wired to your email capture system or a lightweight endpoint.

Accessibility & responsiveness:
- Responsive grid collapses to a single column under 940px.
- Labels are provided for form fields.

Integration checklist for final build:
- Add the global SVG assets (assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg) elsewhere in the project if desired.
- Wire the contact form action to your backend or a service (e.g. form endpoint, Zapier, or booking flow).
- Replace placeholders with site-specific content.
- Confirm privacy language and include a privacy policy page if required.

If you want adjustments (different visual emphasis, additional fields, or to convert the lead magnet into a working subscription), tell me which part to update and I will produce the next iteration.