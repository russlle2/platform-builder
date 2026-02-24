This chunk contains the contact page and notes for the wellness coach site.

Files included:
- contact.html: Self-contained contact page with interactive features.

Key interactive features (local JS only):
- Mood-to-Method selector
  - Dropdown selects current state (calm, overwhelmed, stuck, energized, adrift).
  - The recommended method card updates to show a short set of immediate steps.
  - The primary CTA (send button) text updates to reflect the recommended micro-offer.

- Progress meter / 30-day path map
  - Checkboxes let the user choose up to 4 goals (Sleep, Movement, Nutrition, Focus, Social, Stress tools).
  - "Map my 30‑day path" builds a 30-tile grid with color-coded daily focus items and a small week-by-week prompt.
  - No external services; all rendering is handled in-page.

Placeholders present (must be replaced by the build system):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Implementation notes:
- No external assets or CDNs required. The page references an SVG pattern in the overall project at assets/img/pattern.svg if present; this page does not require that asset to function.
- The contact form action is simulated: it validates presence of email and message then shows a mock confirmation.
- All copy avoids medical claims and focuses on habits, frameworks, and outcomes.

How to test locally:
1. Open contact.html in a browser.
2. Try the Mood dropdown — observe the method card and CTA text change.
3. Select several goals and click "Map my 30‑day path" to render the tile grid and legend.
4. Fill form fields and press the CTA to see the simulated send flow.

Accessibility and behavior:
- Simple semantic elements are used; tiles have title attributes for quick hover information.
- The design intentionally keeps color contrasts moderate and relies on text labels alongside color.

Developer tips:
- To change the mood-method options or colors, edit the `methods` constant and `colorMap` in the script inside contact.html.
- The CTA uses the placeholder {{PRIMARY_CTA_LABEL}} as a default; mood choices temporarily override its text when selected.

End of README.