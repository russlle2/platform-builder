Chunk 4 — contact.html

What this bundle contains:
- contact.html: A complete contact + session planner page for the aromatherapy site.

Key features implemented:
- A local, accessible 'Session Planner' widget that builds a personalized aromatherapy plan and produces a plain-text summary. The summary can be copied to clipboard via the Copy summary button.
- Scroll-triggered reveal animations implemented with IntersectionObserver. The page respects prefers-reduced-motion: users who request reduced motion will see content without animation.
- Safety-forward copy: patch test, dilution guidance, pets and pregnancy notes included in FAQ and in the generated plan. All therapeutic language uses "may support" or nondirective phrasing.
- Navigation uses a distinct label set and correct links to the other pages in the project.
- Visual richness relies on CSS and a referenced SVG pattern at /assets/img/pattern.svg (no external CDNs or fonts).

Placeholders used (replace them when building/live testing):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

How to test locally:
1. Place this file in your project root or the intended location alongside the other site pages.
2. Ensure an SVG pattern exists at assets/img/pattern.svg (the page references that path for background texture).
3. Open contact.html in a browser.
4. Use the Session Planner: fill intent, duration, mood, sensitivity, and optional notes. Click "Create plan" to render a plain-text summary. Click "Copy summary" to copy it to the clipboard.
5. Test reduced motion: enable "Reduce motion" in your OS or browser preferences and reload the page to confirm immediate reveal (no animations).

Notes for integrators:
- The generated plan is plain text and aims to be portable — copy into an email, notes app, or a client intake form.
- The code avoids external dependencies; all JS is inline and small. It is easy to move the JS to an external file if desired.
- Replace placeholders before publishing.

Design voice: minimal, poetic, safety-oriented. Layout family: asym_masonry (asymmetric grid blocks and an aside for quick contact info).

If you want, I can also produce the remaining pages to complete the site: index, services, blends, shop, pricing, about, book.