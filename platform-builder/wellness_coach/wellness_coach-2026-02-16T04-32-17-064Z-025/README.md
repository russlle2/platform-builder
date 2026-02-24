# {{BUSINESS_NAME}} — Contact Page (Chunk 4)

This bundle contains the contact page and a README for the wellness coaching site. The layout style follows the "aura_editorial" design family: high-contrast editorial hero, bold type scale, and premium spacing.

Files included:
- contact.html — full contact page with mini-sections that echo hero, story, framework, programs, pricing, testimonials, and CTA so the required section pack ripples here.

Placeholders used (replace these with real values):
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

Notes & implementation details:
- The contact page contains an editorial hero with a compact intake form, brief story, framework summary, program snapshots, pricing preview, testimonials, and a final CTA — matching the required section pack.
- Three decorative SVGs are embedded inline (hero-svg, avatar-svg, pattern-svg). In other chunks these are expected as separate files under assets/img/*.svg; the inline SVGs here act as unique, local SVG asset placeholders and are intentionally bespoke.
- No external assets, fonts, CDNs, or analytics are used.
- The contact form uses simple client-side validation and a simulated submit (alert). Replace with your backend endpoint or form handler for production.
- Copy avoids medical claims and focuses on habits, frameworks, and outcomes.

Accessibility & responsiveness:
- The design is responsive down to narrow screens using CSS grid and flex layouts.
- Semantic headings and landmarks are included for screen-reader navigation.

How to use:
1. Replace placeholders with your real values.
2. If you prefer separate SVG asset files, extract the inline <svg> blocks and save them to assets/img/hero.svg, assets/img/avatar.svg, and assets/img/pattern.svg; update references accordingly.
3. Hook the form to your preferred service (email endpoint, Zapier, or server-side handler).

Design guidance:
- Keep the primary CTA label concise (e.g., "Book Discovery", "Start Now").
- Use the pricing preview copy to manage expectations (from $...) and move detailed pricing to pricing.html.
- Maintain the habit-focused language: emphasize tiny experiments, accountability, and repeatable frameworks.

If you need updated variations (different nav labels, alternate CTA copy, or a form integrated with a specific provider), request the next chunk and specify integrations.