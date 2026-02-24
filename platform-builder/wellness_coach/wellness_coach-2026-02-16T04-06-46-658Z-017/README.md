# wellness_coach-2026-02-16T04-06-46-658Z-017 — Chunk 4

This bundle contains the contact page and a README for the Aura Editorial wellness coach template.

Files included in this chunk:
- contact.html — full contact / connect page built to the "aura_editorial" layout family.

Placeholders used (replace with real values before publishing):
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

Design & structure notes:
- The contact page intentionally includes the required section pack that should ripple across index and other pages: hero (Centering Statement), values (Core Principles), methods (My Framework), objections (Common Concerns), testimonials (Client Voices), lead_magnet (Free Guide), and cta (Begin Today).
- The page uses high-contrast editorial typography, bold scales and a compact right-side panel for the contact form.
- Navigation labels are intentionally slightly different (e.g., "Paths", "Rates", "Stories") to keep tone varied across templates.

Form integration:
- The contact form POSTs to /api/contact. Replace that action with your form handling endpoint or add serverless function to process submissions.
- The lead magnet form is a GET that points to {{PRIMARY_CTA_URL}}. Replace with your email capture endpoint or a landing route.

Accessibility & responsiveness:
- Built with simple semantic structure and responsive CSS breakpoints. Inputs include labels and placeholders.

Assets:
- This chunk references local SVGs located under assets/img/ (hero.svg, avatar.svg, pattern.svg). Ensure the project includes unique SVGs with those exact filenames. Do not use external CDNs or fonts — the template assumes local assets only.

Editing tips:
- Swap placeholder values globally (automation or search/replace) before publishing.
- Adjust colors in the inline style block (root variables) to match brand palette.
- If you need to collect more intake fields, add them to the form and mirror validation in your backend.

Legal & content guidance:
- Copy avoids medical claims and focuses on habits, frameworks, and outcomes. Keep that framing consistent across pages.
- Update privacy and terms pages to reflect data handling for contact and lead magnet forms.

Questions:
- For component changes or additional pages, follow the same editorial structure: clear headings, compact panels, and outcome-led messaging.