Project: {{BUSINESS_NAME}} — lux_gallery templates

Overview:
This repository contains a cohort-focused wellness coach website scaffold styled for a "lux_gallery" layout family. The voice is a spiritual teacher tone and the programs follow a cohort model. All pages use placeholders so you can inject your business details.

Files included in this chunk:
- contact.html — Premium contact page with hero, diagnostic prompts, micro-habit preview, plan summary, pricing hints and CTA. Links to other pages in the site.

Placeholders (replace across files):
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
- Layout family: lux_gallery (large imagery, restrained motion, gallery-like cards).
- Required site sections (hero, diagnostic, plan, micro_habits, pricing, cta) are surfaced on the contact page as actions and anchors so the flow from index -> contact is cohesive.
- No external assets or CDNs are referenced. SVGs expected in assets/img/: hero.svg, avatar.svg, pattern.svg (these are created in other chunks).

How to use:
1. Replace placeholders with your business content (or use a simple templating step).
2. Ensure assets/img/hero.svg, avatar.svg and pattern.svg exist in the project root as referenced by the HTML.
3. Serve the folder with any static server (e.g., `npx serve .` or open contact.html in a browser).

Accessibility & UX:
- Form includes basic client-side validation.
- Clear contact pathways: phone, email, scheduled diagnostic, and cohort placement links.

Developer tips:
- Maintain varied navigation labels across pages (e.g., "Paths" vs "Programs" vs "Work With Me") for a human, curated feel.
- Program names and pricing framing should be unique on each page to meet the uniqueness requirements.
- Keep the spiritual teacher voice: warm, wise, clear on outcomes and daily practices without medical claims.

Pages in the full template (other chunks will contain):
- index.html
- about.html
- services.html
- programs.html
- pricing.html
- testimonials.html
- book.html
- contact.html

If you need an export-ready set of SVGs or a different layout family, request the corresponding chunk. Thank you.