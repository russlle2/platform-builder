Contact page and utilities for the aromatherapy membership site.

Files in this chunk:
- contact.html : The contact page with two interactive tools — Session Planner and Blend Builder — plus quick contact info and FAQ highlights.

How to use locally:
1. Place contact.html in your site root alongside the other pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html).
2. Ensure assets/img/pattern.svg exists for the background band. The CSS references that path.
3. Open contact.html in a browser. The page runs entirely client-side — no server required.

Interactive features summary:
- Session Planner: choose intention, length, cadence, environment, and add notes. Click "Create plan" to generate a plaintext plan summary. Use "Copy plan" to copy it to the clipboard. Reset clears inputs.
- Blend Builder: pick a vibe, intensity, carrier volume and approximate drops-per-ml value. Click "Make blend" to get a suggested blend card and conservative dilution guidance. "Copy blend text" copies the non-medical plain-text card. Reset clears the form.

Placeholders to replace in the HTML:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}} (not used directly on this page but present in the site template)
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Safety notes included in the page copy and the widget outputs:
- Language avoids medical claims and uses "may support" phrasing.
- Dilution guidance is conservative and presented as general education, not medical direction.
- FAQ contains patch test, pregnancy, medication, and pet safety reminders.

Accessibility & privacy:
- Widgets use clear labels and live regions where appropriate.
- All functionality is local; no external network requests are made by the page's scripts.

If you need a matching SVG pattern (assets/img/pattern.svg) or further changes to the UI tone or palette, request the asset and I will provide it in the next chunk.