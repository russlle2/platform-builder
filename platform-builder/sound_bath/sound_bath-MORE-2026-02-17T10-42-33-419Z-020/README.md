Contact page and local interactive features — chunk 4

This bundle contains two files for the sound bath site (chunk 4):

Files
- contact.html — The contact / connect page with local interactive widgets.
- README.md — This file.

Highlights
- Unique site voice and layout: earthy_warm + mystic_modern.
- No external assets, fonts, or CDNs referenced.
- All text uses placeholders where appropriate: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Interactive features implemented (local, client-side only)
1) Event seat selector (simulated)
   - Select an event from a curated local list.
   - Choose number of seats to hold; "Hold seat (local)" reduces available seats locally.
   - A mini calendar lists upcoming events.

2) Packing-list generator
   - "Prepare packing list" generates a suggested packing checklist based on selected event and seat count.
   - Tailors suggestions to event notes (e.g., longer sessions include extra blanket advice).

3) Two "Try it now" guided practice entry points
   - "Try it now — Breath": Opens a modal with a box-breathing guided visual and subtle tones generated with the Web Audio API. Visual breathing circle animates (no external media).
   - "Try it now — Journal": Opens a modal offering two short journaling prompts with a gentle tone transition.
   - Both runs purely in JavaScript, no network calls.

4) Contact form (local demo)
   - Simple form with required fields. Submission is simulated locally and shows a confirmation message.

Accessibility & UX
- Modal is keyboard-friendly (Escape closes it). Buttons are labeled and interactive elements are focusable.
- Contraindications disclaimer included responsibly in the contact card.

Nav labels
- Custom navigation labels differ from default templates: Gatherings, Calendar, Personal Sessions, Contributions, The Guide, Curiosities, Reserve, Connect.

Notes for developers
- The page references assets/img/pattern.svg for the background pattern. Ensure that file exists in the project tree (a unique SVG pattern should be created for visual richness).
- The interactive features are strictly local: no server or network integration is implemented here.
- Tone generation uses the Web Audio API; some browsers may require a user gesture to enable sound (the buttons provide such gestures).

Testing
- Open contact.html in a browser (double-click or via a local server).
- Use the event selector and hold seats to observe local state changes.
- Click "Prepare packing list" to see the dynamic checklist.
- Click "Try it now — Breath" or "Try it now — Journal" to open the guided modal and navigate steps.
- Test form submission (local simulation) using the "Send inquiry" button.

Placeholders to replace in production
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Contraindications & Ethics
- The page includes a clear contraindications block. If you adapt copy or features for production, maintain or expand the medical/clinical disclaimers and consider adding an explicit consent flow where needed.

Design notes
- Colors and layout use a warm, earthen palette. The layout is responsive and should work comfortably on phones and desktop.

If you need the matching pattern SVG or further pages in this layout family, request the next chunk and include an assets/img/pattern.svg to complete the visual system.