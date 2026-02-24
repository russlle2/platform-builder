This bundle chunk contains two files for the wellness coach website (layoutFamily: lux_gallery, voice: executive_coach, programModel: intensive).

Files included:
- contact.html — Full contact page and supporting sections. It includes hero, values, methods, objections, testimonials, lead_magnet, and CTA so the required section pack clearly appears on this page as well as the index.
- README.md — This file.

Placeholders (replace these in your build or templating step):
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

Assets required (expected to be in the project root):
- assets/img/hero.svg
- assets/img/avatar.svg
- assets/img/pattern.svg

Notes and guidelines:
- Design intent: lux_gallery — gallery-style sections, large illustrative SVGs, restrained motion, premium spacing. Keep SVGs visually bold and unique for each template.
- The contact page contains a lead magnet form (client-side placeholder alert) and an email form that posts to mailto:{{EMAIL}}. Replace with your preferred backend form endpoint if needed.
- Content follows the wellness coach realism rules: focus on outcomes, habits, and frameworks without medical claims.
- Navigation links are relative and point to the other pages expected in the full bundle (index.html, about.html, programs.html, pricing.html, testimonials.html, book.html, contact.html).

Local testing:
1. Ensure the assets listed above exist locally.
2. Open contact.html in a browser. No external fonts or CDNs are required.
3. Replace placeholders manually or via your templating system before publishing.

Accessibility:
- Semantic headings and ARIA labels are used for main sections.
- Forms include labels and simple client-side validation where applicable.

If you need alternative copy tone, different section ordering, or integration with a specific form provider (e.g., Formspree, Zapier), provide the preference and the next chunk can include adjusted markup and scripts.