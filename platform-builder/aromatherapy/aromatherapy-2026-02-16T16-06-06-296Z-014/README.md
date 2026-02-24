Contact page for the aromatherapy web project (chunk 4)

Files included:
- contact.html — a full, self-contained contact + information page.

Purpose:
- Provides a safety-forward contact experience for clients seeking aromatherapy consultations.
- Includes required sections: hero, myth_vs_truth, pillars, case_notes, faq, cta.
- Uses placeholders for runtime substitution: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{FAVORITE_BLEND}}.

Design notes:
- Layout family: bold_playful (playful shapes, bold typography, rounded cards).
- Voice family: clinical_calm (measured, safety-oriented copy; no medical claims).
- Offer model: hybrid (references to virtual + in-person options).
- Visual richness is provided through CSS and an inline SVG pattern. No external fonts or CDNs used.

Integration:
- Drop contact.html into the project root alongside other pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html).
- Replace placeholders at build time or via your templating system.
- PRIMARY_CTA_URL should point to your booking endpoint; currently it's a placeholder. The form will show a friendly alert if PRIMARY_CTA_URL is not replaced.

Accessibility & safety:
- Copy avoids medical claims; FAQ covers dilution, patch testing, pets, and pregnancy guidance.
- Includes a clear emergency reminder for users.

Developer notes:
- The page references a unique decorative SVG; you may also create assets/img/pattern.svg if you prefer an external file.
- To adapt for localization, replace contact details and practitioner name in placeholders.

License: project-specific; treat content and structure as part of the overall site design.
