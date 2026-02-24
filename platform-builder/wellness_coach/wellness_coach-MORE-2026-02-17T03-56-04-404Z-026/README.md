# Contact — wellness_coach-MORE-2026-02-17T03-56-04-404Z-026

This bundle contains the contact page and a small README for the wellness coach template.

Files included in this chunk:
- contact.html — The full Connect / Contact page.

Placeholders (replace when deploying):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

What this page implements:
- Contact form with local client-side mock response (no backend required).
- Proof Gallery: rotating testimonials and credibility badges. Badges reveal tooltips on hover and trigger a simple alert on click for keyboard accessibility.
- Pricing Comparator: a toggle between "Single" and "Package" views with animated price transitions.
- Accessible elements: role/tablist and aria-selected usage for the toggle, keyboard support for badges.
- Local-only assets and styling (no external CDNs).

Notes for integration:
- This file expects other site pages to exist: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html.
- The background pattern SVG is referenced elsewhere as assets/img/pattern.svg; ensure the asset is present with the project.
- Replace placeholders with real values before publishing.

How to preview locally:
1. Place this file alongside the other site files in a folder served by a static server (for example: `python -m http.server` in the folder).
2. Open http://localhost:8000/contact.html

Design/UX notes:
- The copy emphasizes practical habits, outcomes, and short guided paths consistent with the niche rules (no medical claims).
- Navigation labels are intentionally different (Home, Philosophy, Offerings, Programs, Invest, Voices, Book, Connect).

If you need edits to tone, layout, or interactive behavior, tell me what to adjust and I will provide an updated file.