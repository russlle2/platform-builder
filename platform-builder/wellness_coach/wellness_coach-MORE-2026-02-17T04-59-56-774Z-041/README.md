This bundle contains the contact page and usage notes for the wellness coach site (asym_masonry, playful_premium voice).

Files included in this chunk:
- contact.html  — contact page plus two interactive tools: Session Planner and 7‑Day Challenge habit builder.

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features in contact.html:
- Session Planner: fill in name, goal, weeks, sessions/week, session length and focus areas. Click "Build Plan" to create a plain-text roadmap. Use "Copy summary" to copy to clipboard or "Download .txt" to save.
- 7‑Day Challenge (Habit builder): enter a micro-habit, choose tone (gentle/steady/bold) and start date. "Make challenge" generates a printable checklist. Use "Print checklist" or "Copy checklist" to export.

Notes for integration:
- Navigation links point to: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html.
- The page uses inline SVG for a unique background pattern; no external assets are required for this chunk.
- The scripts are local and require no external libraries.

Design & content guidance:
- This page is intended to be friendly and practical. Keep coaching copy focused on outcomes, habits, and frameworks; avoid medical claims.
- Update placeholders with the real business details. Adjust colours in the :root CSS variables if you want a different accent.

If you need a separate assets SVG file (assets/img/pattern.svg) for reuse across pages, export the inline SVG from contact.html and save it to that path, and update other pages to reference it.