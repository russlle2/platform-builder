# {{BUSINESS_NAME}} — Site bundle (zen_minimal)

This chunk contains two files for the wellness coaching website: `contact.html` and this `README.md`.

Purpose
- contact.html: A minimal, premium contact and booking page styled for the "zen_minimal" layout. It includes a contact form, quick contact details, a short coaching rationale, and links to other pages in the site.

Placeholders
- Replace these placeholders across the site with your real values:
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

Notes
- This page assumes three SVG assets exist at `assets/img/avatar.svg`, `assets/img/hero.svg`, and `assets/img/pattern.svg`. If those are provided in other chunks, no action is required. If you are assembling locally, ensure `assets/img/avatar.svg` is present so the avatar image appears.
- Navigation links point to the other templates in the project (index.html, about.html, programs.html, pricing.html, testimonials.html, book.html). Keep those files in the same folder for the links to work.

Form behavior
- The form builds a `mailto:` link to {{EMAIL}} when submitted. This avoids relying on a backend. If you want server-side handling, replace the `onsubmit` handler with a fetch to your API endpoint and adapt form `action` accordingly.

Styling and design
- The layout uses a restrained palette, generous white space, and simple components to reflect a calm, premium brand.
- The page prioritizes clear outcomes and low-friction contact: a primary booking CTA, program choices, and a visible promise of a free 7-day habit starter.

Local preview
- The simplest way to preview the page locally:
  - Python 3: `python -m http.server 8000`
  - Then open `http://localhost:8000/contact.html` in a browser.

Accessibility
- Form controls include labels and the layout scales for smaller screens.
- If adding custom SVGs, ensure they include appropriate `role` and `title/desc` where needed.

Design decisions
- Voice: friendly, practitioner-focused (coach_friend). Tone emphasizes sustainable habits and clarity without medical claims.
- Layout family: zen_minimal — minimal chrome, calm colors, soft radii.

Next steps
- Replace placeholders with real brand content.
- Add the remaining site pages and the three SVG assets (hero, avatar, pattern) in `assets/img/`.
- If you prefer automated form capture, wire the form to a server endpoint or use a form provider and update the script.

If you need the complementary pages (index, about, services, programs, pricing, testimonials, book) or the SVG assets generated to match this style, request the next chunk and include the desired variations for headings, program names, and pricing tone.