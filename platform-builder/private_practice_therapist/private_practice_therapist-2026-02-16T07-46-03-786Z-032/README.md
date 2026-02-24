Project chunk: contact page and README for private_practice_therapist

Files included in this chunk:
- contact.html  -> Full contact page following the aura_editorial layoutFamily (editorial hero, high contrast, bold typographic scale). Contains the required sections: hero, values, methods, objections, testimonials, lead_magnet, cta.

Placeholders used (replace these server-side or via templating):
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
- No external fonts or third-party scripts are referenced; styles are self-contained in a small CSS block to maintain a premium editorial look.
- The page includes clear clinical disclaimers: confidentiality limits, crisis guidance, scope/boundaries, and a privacy note for email communication.
- The contact form uses a simple mailto fallback (action="mailto:{{EMAIL}}") intended as a placeholder. Integrate with your backend or a service (e.g., secure form handler) before going live to avoid exposing email and to ensure reliable delivery.

Assets:
- The page references local SVGs expected to exist at:
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg

  These should be unique SVGs created for the project and added to the assets/img directory. The contact page uses assets/img/hero.svg; other templates may use avatar.svg and pattern.svg.

Accessibility & privacy:
- Form fields include labels (visually hidden) and required attributes to support assistive tech.
- The page intentionally includes clear, clinician-written language about confidentiality, crisis response, and scope; do not remove these statements.

Integration tips:
- Replace placeholders at build time or via your template engine.
- For the lead magnet, the small form points to {{PRIMARY_CTA_URL}} (GET). Adjust to your mailing list provider (Mailchimp, ConvertKit, etc.) or your server endpoint.
- For bookings, set {{PRIMARY_CTA_URL}} to the scheduling provider (e.g., a secure booking link).

Ethical reminders for deployment:
- Do not claim cures or guaranteed outcomes. Keep language supportive and evidence-informed.
- Ensure secure handling of client contact info and comply with local privacy regulations.

If you need the remaining pages (index, about, specialties, approach, fees, faq, book) or the SVG assets created now, request the next chunk and specify whether to inline SVGs or save them as separate files.