Contact page and quick toolkit for the wellness_coach template (chunk 4).

Files included:
- contact.html  — The contact page with a client-facing form, a 7-day habit builder with printable checklist, and three guided micro-exercises (breathing, journaling, intention setting). All interactions run in-page using vanilla JavaScript; no external services.

Placeholders you should replace (exact tokens):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

How it works:
- Habit Builder: pick a focus area and click "Create challenge". The page generates 7 compact actions and a printable checklist. Use the "Print checklist" button or your browser print to produce a printable sheet (CSS includes a print-only view: #print-root).
- Guided exercise modal: open a short breathing cycle, journaling prompt, or intention-setting mini practice. Breathing runs a timed loop (2 minutes default); journaling includes a 5-minute timer; intention-setting saves a short framing line locally in the modal.

Notes for integration:
- The contact form posts to mailto:{{EMAIL}} by default. Adjust the form action or hook it to your backend as needed.
- Decorative SVG is embedded inline in the page (pattern). The broader project may include an assets/img/pattern.svg asset; if so, swap or augment the inline SVG in contact.html.
- No external fonts, CDNs, or images are referenced in this chunk.

Accessibility & printing:
- Modal has aria-hidden toggles and can be closed with the Escape key.
- Printable checklist is limited to the #print-root area when printing.

Customization suggestions:
- Edit the bank of micro-habits in the JS (variable "bank") to match your coaching language and frameworks.
- Adjust timers and copy in the guided exercises to reflect your preferred pacing.

This chunk is focused on the Connect/Contact experience and the micro-tools that help visitors try an approach before booking an intensive.