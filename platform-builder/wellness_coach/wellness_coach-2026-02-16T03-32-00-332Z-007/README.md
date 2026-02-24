Project chunk: contact + documentation

Purpose:
This chunk contains the contact page template (contact.html) and this README. The design follows the 'aura_editorial' layout family: bold typography, high-contrast palette, editorial spacing, and intentional CTAs.

Files included:
- contact.html  (primary contact page with hero, diagnostic snapshot, plan outline, micro_habits, pricing teaser, and CTA form)

Placeholders used (replace at build/runtime):
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
- This page intentionally echoes the required section pack (hero, diagnostic, plan, micro_habits, pricing, cta) so the page set feels cohesive when linked from index.html and other pages.
- The nav labels differ slightly from other templates (Home, Paths, Work With Me, Connect) to satisfy uniqueness across templates.
- The contact form uses a simple mailto action for portability. Replace with your form endpoint or client-side handler as needed.

Assets expected elsewhere in the project (local SVGs):
- assets/img/hero.svg
- assets/img/avatar.svg
- assets/img/pattern.svg

These SVGs are referenced from contact.html; they must be provided in the assets/img folder in the final build. Each page template in the full project should have unique SVGs (no copying) to preserve visual uniqueness.

Content guidance:
- Voice is 'spiritual_teacher' — warm, grounded, purposeful language. Copy avoids medical claims and focuses on habits, frameworks, and outcomes.
- Program names are distinct here: Foundation Rituals, Momentum Cocoon, Guided Cohort.
- CTA buttons reference the primary CTA placeholder: {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}.

Accessibility & responsiveness:
- Layout is responsive with a single-column fallback under 880px.
- Form fields are labeled and inputs follow a simple visual contrast.

How to localize or customize:
- Replace placeholders in your build process or via a templating engine.
- Swap the mailto form action for an API endpoint for production use.
- Provide local SVG files with the expected names and sizes to match the editorial layout.

Licensing and assets:
- No external fonts, CDNs, or analytics are referenced in this chunk. All visuals should be local assets.

If this chunk is combined into a larger site, ensure other pages vary heading phrasing, program names, and FAQ wording to meet uniqueness constraints.