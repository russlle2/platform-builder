Contact page for the aromatherapy membership site (slug: aromatherapy-2026-02-16T16-55-19-014Z-024).

Files included in this chunk:
- contact.html — Fully self-contained contact and membership pitch page. Includes hero, diagnostic, plan, micro_habits, pricing, and cta sections as required.

Placeholders you should replace in your build system or templating engine:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}}

Design notes and customization:
- Layout: split_diagonal aesthetic implemented via a skewed pseudo-surface and an inline SVG background. No external assets or CDN calls.
- Visuals: SVG pattern is embedded in the header (class bg-svg). If you want a separate asset, replace the SVG with an <img> referencing assets/img/pattern.svg and provide that file in your assets pipeline.
- Accessibility: simple semantic elements and clear labels. The diagnostic and contact form are functional without external services.
- Safety-forward: the page intentionally avoids medical claims and includes a safety note. Keep language consistent with aromatherapy safety best practices when editing content.

Developer tips:
- Diagnostic: Small JS collects three choices and returns a guided, non-medical recommendation. You can expand the logic server-side if you want to store results.
- Forms: contact form is client-side only and shows a mock send alert. Wire it to your backend or an email provider as needed.
- Membership: Pricing and tiers are static; adjust numbers and benefits in the pricing section of contact.html.

Styling and components:
- CSS variables at the top of contact.html control color, radius, and shadow. Tweak to match your brand.
- The page uses no external fonts; swap in a local font-face block if required.

Safety & compliance reminders for aromatherapy sites:
- Always include dilution and patch-test guidance when suggesting topical use.
- Avoid therapeutic or diagnostic claims (e.g., curing or treating conditions).
- Provide clear notes about pregnancy, nursing, children, and pet safety; link to qualified resources as appropriate.

If you need an assets/img/pattern.svg created to centralize the background pattern, request it in the next chunk and include it in your assets bundle. This page already contains an inline SVG to ensure visual uniqueness without additional files.