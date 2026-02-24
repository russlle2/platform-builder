# holistic_medicine-MORE-2026-02-17T21-17-08-091Z-039 — Contact page chunk

This chunk contains two files for the holistic/integrative medicine site (layoutFamily: lux_gallery). It focuses on the contact page with interactive planning features and a short README.

Files included in this bundle:
- contact.html — full contact page with Mood-to-Method selector and editable 3-phase Timeline Planner. It uses local JS and no external assets. The page references a decorative SVG pattern at `assets/img/pattern.svg` (not included in this chunk).
- README.md — this file.

Placeholders (leave as-is so a templating step can replace them):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key interactive features in contact.html:
- Mood-to-Method selector
  - Four mood options. When the user selects one, the page updates the recommended approach title, description, and adjusts the primary CTA text and URL (appends query params like `?source=mood&state=...`).
  - The mood selector syncs with the contact form dropdown.

- Timeline planner (3 phases)
  - Each phase has an editable content area (contenteditable) and a weeks input.
  - "Preview plan" summarizes the roadmap weeks.
  - "Download plan" exports a JSON file of the phases.
  - "Use as message" injects the plan into the contact form message and stores the JSON in a hidden input.
  - A clear disclaimer notes that the roadmap is educational and not medical advice.

Form behavior:
- Submitting the contact form composes a `mailto:` link with a JSON payload summarizing the submission (demo behavior in a static environment). In a real deployment replace this with an API endpoint.

Design notes / constraints:
- No external fonts, images, or CDNs were used here.
- The page uses a subtle pattern reference `assets/img/pattern.svg` for decoration; the actual SVG file should be added in a later chunk.
- Tone is educational and supportive; no promises or curative language.
- Navigation labels differ from the most common sets (Home, Programs, Approach, Team, Book, Connect).

How to test locally:
1. Save `contact.html` to a local folder.
2. Open it in a modern browser (Chrome, Firefox, Safari).
3. Try the Mood-to-Method selector by clicking mood tiles; watch the CTA and description update.
4. Edit text inside each phase, change weeks, then use "Preview plan", "Download plan", and "Use as message".
5. Fill the contact form and submit — this will open your default mail client with a prefilled body (demo behavior).

Accessibility & considerations:
- Buttons and interactive controls include aria attributes and focusable elements.
- Contenteditable regions are labeled for screen readers.

If you need additional pages or assets (pattern SVG, global CSS, or the rest of the site), request the next chunks. This chunk targets only `contact.html` and `README.md` as requested.