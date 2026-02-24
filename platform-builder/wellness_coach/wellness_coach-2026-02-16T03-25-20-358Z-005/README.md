Contact page and integration notes for the wellness coach site (lux_gallery layout).

Files in this chunk:
- contact.html — full-contact template built for {{BUSINESS_NAME}} with hero, myth_vs_truth ripple, pillars, case_studies, compact faq, and a prominent CTA/form.

Placeholders to replace (keep curly braces):
- {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{COACH_NAME}}, {{CREDENTIALS}}, {{CITY}}, {{STATE}}

Design & behavior notes:
- The page follows the lux_gallery family: large hero visual, gallery-style pillars and case study tiles, restrained color accents.
- Voice: scientist_guide — analytical, practical, and evidence-oriented. Copy avoids medical claims and focuses on habits, frameworks, and membership.
- The contact form does not post to a server in this template. Replace the form action and add a server-side endpoint or form provider for production. A hidden input _recipient is included with {{EMAIL}} as a hint for email-forwarding setups.

Assets expected (not included in this chunk):
- assets/img/hero.svg — large hero illustration (unique per template)
- assets/img/avatar.svg — small avatar SVG (used on other pages)
- assets/img/pattern.svg — decorative pattern (used on other pages)

Accessibility & responsiveness:
- Basic responsive grid provided; nav collapses on small screens. Form fields are labelled.

How to wire up form submissions:
- Option A: Replace form action with a server endpoint that accepts POST and sends to {{EMAIL}}.
- Option B: Integrate with a form service (Formspree, Netlify Forms, etc.) by changing method/action and adding required tokens.
- Option C: Use AJAX to send JSON to an API and return a success response; update handleSubmit accordingly.

Quick customization checklist:
- Swap placeholder text with client details.
- Add or replace hero SVG in assets/img/hero.svg ensuring it matches the gallery aesthetic.
- Connect the primary CTA button ({{PRIMARY_CTA_URL}}) to the booking flow or membership sign-up.

Notes about required ripple sections:
- This page intentionally includes compact versions of the required index sections: hero, myth_vs_truth, pillars, case_studies, faq, cta — so the design language remains consistent across the site.

If you need server-side templates or translation into a templating language (e.g., Handlebars, Jinja), provide target environment details and I will adapt the markup and placeholders accordingly.