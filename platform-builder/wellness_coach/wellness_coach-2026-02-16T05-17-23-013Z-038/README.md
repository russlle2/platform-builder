Project: wellness_coach-2026-02-16T05-17-23-013Z-038

Overview:
This chunk contains two files for the wellness coach template (earthy_warm, voice: spiritual_teacher, cohort model):
- contact.html — full contact page with inline styles and form behavior
- README.md — this file

Placeholders used throughout the template (fill these before publishing):
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

Notes on contact.html:
- Designed to be standalone and work without external assets or analytics.
- Uses an inline mailto fallback for the contact form. No server required to test; submitting opens the client's mail app.
- Navigation links point to the other project pages (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html). Ensure those pages are present in your build.
- The page emphasizes cohort-style offerings, micro-habits, and a diagnostic flow (links to index anchors such as index.html#diagnostic and index.html#plan). Those anchors should exist on index.html.

Assets:
- This chunk does not include external SVG asset files. The full project expects (recommended) local SVGs under:
  assets/img/hero.svg
  assets/img/avatar.svg
  assets/img/pattern.svg
Place unique SVGs in those locations if you want to reference them from other pages.

Customization:
- Replace placeholders with real values (search/replace across files).
- To change the color tone, edit the CSS variables at the top of <head> in contact.html.
- To change the cohort options or schedule, update the <select> options in the contact form.

Local testing:
- Drop these files into a static site folder alongside the other HTML pages of the template.
- Run a local server (for example):
  python -m http.server 8000
  Then open http://localhost:8000/contact.html

Accessibility & legal:
- Form fields include labels for basic accessibility. The mailto fallback is used as a lightweight contact mechanism — for production use, integrate a backend endpoint or a form provider with privacy-compliant data handling.
- The template avoids medical claims and focuses on coaching outcomes and habit frameworks.

If you need additional pages or the SVG assets created in this chunk, ask for the next chunk and specify any preferred shapes, colors, or motifs for those SVGs.