Chunk: contact page (wellness_coach-MORE-2026-02-17T05-21-10-888Z-046)

Files included in this bundle:
- contact.html  — interactive contact page with Mood-to-Method and 30-day path planner
- README.md     — this file

Placeholders left in the files (replace as part of templating):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented locally (no external assets/CDN):
- Mood-to-Method selector
  - Click a mood tile to reveal a concise method title, copy, and update CTA label + URL.
  - The main page CTA also updates to maintain contextual continuity.

- 30-day Progress Planner / Path Map
  - Choose up to 5 focus goals, then click "Sketch my 30 days".
  - The page draws 30 day nodes along a curved SVG path and builds a lightweight day-by-day micro-habit model.
  - Click any day node to see the micro-habits scheduled for that day.
  - Reset clears selection and the map.

- Contact form
  - Local-only fake-send that simulates submission and provides lightweight feedback; also a quick "Discuss a VIP Day" filler.

Accessibility and structure notes:
- Navigation links use distinct labels and correct page targets (index.html, about.html, etc.).
- Visuals are implemented with CSS and an SVG background reference to assets/img/pattern.svg (expected to be provided elsewhere in the project).

Developer notes:
- No external fonts or images are loaded. The contact page references assets/img/pattern.svg for decorative background; ensure that file exists in the final build.
- All interactivity is plain vanilla JS. No bundlers are required; drop contact.html into the site root alongside the other pages.
- CTA URLs include query hints for intent (e.g. ?intent=30-day) so back-end or booking links can be handled downstream.

Testing:
- Open contact.html in a browser. Try the Mood-to-Method tiles, build a 30-day plan, and click nodes to inspect the generated micro-habits.
- Replace placeholders with real values to enable accurate contact copy and phone/email links.

Design intent:
- This page is meant for a wellness coach offering VIP Days and 30-day roadmaps. Copy avoids medical claims and focuses on habits, frameworks, and outcomes.

If you need the companion assets (pattern.svg) or other pages from the site, request the remaining chunks.