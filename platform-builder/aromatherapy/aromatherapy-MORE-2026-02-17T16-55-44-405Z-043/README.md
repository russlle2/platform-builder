Chunk 4 — contact.html

Contents
- contact.html — The contact page for the aromatherapy practice site (chunk 4). This single file includes the page UI, CSS, inline unique SVG pattern, and all local JavaScript needed for the interactive features.

Features implemented
- Mood-to-Method selector: choose a mood button (Tight / Stressed, Too Wired, Foggy, Low / Heavy, Seeking Rest). The right-hand card morphs its copy (type, title, description) and the main CTA text and link update accordingly. This is implemented in pure local JS with the moodMap object.
- Pricing Comparator toggle: Monthly vs Package view with animated numeric transitions for the two example offerings (Starter Path and Deep Tune). Toggle updates the units (/mo vs /package) and animates numbers with requestAnimationFrame.
- Contact form: local demo submission handling (no backend). Includes required fields and safety-forward FAQ text about patch tests, dilution, pregnancy, and pets.
- Accessibility considerations: aria-live regions, role attributes for tablists where appropriate, focusable buttons.

Customization
- Replace placeholders in the file with real values:
  - {{BUSINESS_NAME}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}

Notes on assets
- A unique SVG pattern is embedded inline within contact.html for visual richness — this replaces an external assets/img/pattern.svg reference to keep the bundle self-contained.

Local testing
1. Save contact.html to a folder.
2. Open contact.html in a modern browser (Chrome, Firefox, Safari).
3. Interact with the Mood-to-Method buttons and the Pricing switch. Try submitting the form to see the local UI flow.

Safety & copy
- All language is safety-forward: uses "may support" phrasing and includes clear notes about patch testing, dilution, pregnancy, and pets.

Developer notes
- The page uses only local JS and CSS — no external fonts or CDN dependencies.
- To integrate into the full site, ensure links in the header point to existing pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html).
- CTA links produced by the Mood-to-Method selector append a query parameter (e.g. ?plan=focus) to the supplied {{PRIMARY_CTA_URL}}. Update server-side handlers or booking links to accept these parameters if needed.

If you need the pattern extracted to a separate assets/img/pattern.svg file for reuse across pages, I can provide that as an additional file in a following chunk.