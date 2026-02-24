Contact page and interactive tools for the wellness_coach site (chunk 4).

Files included:
- contact.html — The Connect page. Contains two built-in, client-side tools:
  1) Session Planner: build a multi-week session rhythm, preview it as plain text, copy to clipboard or download as a .txt file. Uses local JS only; no backend required.
  2) 7-Day Challenge Builder: create a printable checklist for a single habit across seven days. You can copy the checklist text or open a print preview (it opens a small print document and triggers the browser print flow).

Integration notes:
- This page expects the site root to include the rest of the pages: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html.
- The design references an SVG pattern at assets/img/pattern.svg. That asset should be provided elsewhere in the project so the hero background pattern appears.

Placeholders present in the HTML that must be replaced during deployment or templating:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not displayed on this page but reserved across templates)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility and behavior:
- The contact form is a client-side stub (no backend); it demonstrates intent and local acknowledgement.
- All interactive features work fully in modern browsers without external libraries.
- Print output uses a new window with stripped styles to ensure clean printing.

Developer notes:
- The Session Planner generates plain-text plans with a simple progression algorithm and allows copy/download.
- The Challenge Builder produces checklist items with small daily prompts; these are intentionally outcome-oriented and avoid making medical claims.

If you need the SVG pattern file (assets/img/pattern.svg) created here as a unique asset, request the next chunk so it can be added alongside the remaining pages.