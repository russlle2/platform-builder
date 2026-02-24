# Contact page and features

This bundle contains the contact page (contact.html) for the aromatherapy site and a short README.

Files:
- contact.html — the contact page with interactive features and full layout.

Placeholders to replace in production:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not displayed on this page but reserved site-wide)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key design choices:
- Layout follows a glass-morphism visual language via soft translucent cards and muted accents.
- Navigation labels differ from common templates: Home, Offerings, Blends, Shop, Pricing, Story, Book, Reach (links point to the corresponding .html files).
- Voice: warm storyteller; copy avoids any medical claims and uses safety-forward phrasing ("may support").

Interactive features implemented in-page with vanilla JS:
1) Mood-to-Method selector
   - Five moods: calm, focus, sleep, ground, energize.
   - Selecting a mood updates the recommended method card, the primary CTA label, and the shop CTA href.
   - The contact form submission simulates redirecting to the chosen CTA URL with simple query params (name, mood).
   - Primary CTA label and behavior change to reflect the chosen method.

2) Aroma wheel
   - An SVG-based wheel with three interactive rings for top, middle, and base notes.
   - Hovering segments shows a floating tooltip with educational copy about that note class.

Safety and FAQ notes:
- The FAQ includes explicit guidance about dilution, patch testing, pets, and pregnancy.
- Copy intentionally avoids medical claims and uses "may support" phrasing.

Integration notes:
- The page references an SVG pattern at assets/img/pattern.svg for background texture; ensure that file exists and is unique to this site.
- No external fonts or CDNs are used; system fonts are preferred.
- The contact form does not POST to a server in this static bundle. Replace the submit handler with your own endpoint when integrating.

Customization:
- Update placeholders with live values.
- Tweak mood mappings in the inline script (moods object) for different CTA text/URLs or method suggestions.

Accessibility:
- Interactive controls are buttons and readable text. The aroma wheel includes aria-label and visible text anchors. Further accessible improvements (keyboard support for wheel interactions) are recommended during final development.

License: This is a template-style page intended to be adapted. Keep safety and dilution guidance accurate when adding oil names or specific recipes.