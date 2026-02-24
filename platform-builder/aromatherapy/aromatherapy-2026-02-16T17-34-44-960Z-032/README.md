This chunk (aromatherapy-2026-02-16T17-34-44-960Z-032, seed=787695556) provides the contact page and a README for a glass-morphism, clinical-calm aromatherapy site.

Files included in this bundle:
- contact.html — A self-contained contact page built for the hybrid service model. Uses glass-morphism styling, an SVG pattern background (referenced at assets/img/pattern.svg), and safety-first language. The form submits to {{PRIMARY_CTA_URL}}/contact (placeholder) and includes fields for name, phone, email, message, service preference, and consent.
- README.md — This file.

Notes & conventions:
- Placeholders to replace: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{FAVORITE_BLEND}}.
- Navigation labels intentionally vary from other pages (e.g., "Essence" for home, "Sessions" for services, "Boutique" for shop, and "Connect" for contact) to meet uniqueness requirements.
- The HTML references an SVG pattern at assets/img/pattern.svg for visual richness; create a matching pattern SVG in that location for the full visual effect.
- Aromatherapy safety: copy avoids medical claims and includes clear notes about pregnancy, pets, dilution, and patch testing. This is informational only — not medical advice.
- Visuals: all richness is via CSS gradients, glass panels, and the patterned SVG; no external assets or CDNs are used.

Accessibility & behavior:
- Forms use semantic inputs and labels.
- The design keeps sufficient contrast for clinical calm voice and supports responsive layout.

Integration:
- Drop this file into the site root alongside the other pages (index.html, services.html, etc.).
- Replace placeholders with real values.
- Ensure assets/img/pattern.svg exists and is unique per project requirements.

If you need a companion assets/img/pattern.svg or variations of the contact experience (e.g., simplified form or direct mail-only contact), request an additional chunk and specify preferences.