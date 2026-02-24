Project chunk: contact page and notes for wellness_coach template (split_diagonal, playful_premium voice)

Files included:
- contact.html  — The contact page with an inlined SVG background (no external assets).

Key features implemented:
- Accessible, lightweight design with an inlined SVG pattern (data URI) used as page background to avoid external assets.
- Scroll-triggered reveal animation for sections using IntersectionObserver; respects prefers-reduced-motion (no motion when requested).
- Interactive "Session Planner" widget that:
  - Collects participant name, goal, weekly time, focus areas, preferred format, and start date.
  - Builds a concise plain-text session script summarizing outcome, weekly plan, session structure, between-session routine, starter prompts, and next steps.
  - Offers a Copy button (uses Clipboard API with fallback) and a Download .txt button.
- Contact form provides a simple mailto flow when sending (no backend assumed).

Placeholders left in the HTML (do NOT replace in this chunk):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Developer notes:
- The SVG pattern is inlined inside the CSS as a data URI to meet the constraints of no external images/assets. If you later split assets, move it to assets/img/pattern.svg and update the CSS URL.
- The planner deliberately outputs plain-text aimed at habits, routines, and frameworks (no medical claims) in compliance with the wellness coach rules.
- Navigation labels are intentionally non-standard (Cohorts, Ways to Work, Investment, Stories) but link to the canonical filenames used across the site.
- This chunk is self-contained; JavaScript is vanilla and avoids external libraries.

How to test locally:
1. Drop contact.html into the site root alongside the other pages.
2. Open contact.html in a modern browser.
3. Try the Session Planner: choose fields and click "Build my session", then Copy or Download.
4. Disable animations via OS settings to confirm reduced-motion behavior.

Notes about uniqueness and constraints:
- Copy and metaphors avoid repeated recent signature tokens as requested.
- No external fonts/CDNs used.
- No images are loaded; the decorative pattern is vector and inlined.

If you want the pattern extracted to a separate file in a subsequent chunk, request creating assets/img/pattern.svg and updating the CSS reference.