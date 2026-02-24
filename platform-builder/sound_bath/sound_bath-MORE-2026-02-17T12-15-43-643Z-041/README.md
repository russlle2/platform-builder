Contact page and usage notes for chunk 4

Files included in this chunk:
- contact.html — Interactive contact page with local JS widgets.

Features implemented (local only):
- Session Planner: build a simple, shareable plaintext plan and copy it to the clipboard.
- Mini seat selector + packing list: quick reserve action with generated what-to-bring list (copyable).
- Full event calendar + seat selector + packing list generator: fake events listed locally; choose date, seat type and qty to generate a tailored packing list and copy it.
- Contact form: simulated submit with in-page acknowledgement (no backend).
- Contraindications notice: clear safety disclaimer included — encourages contacting via {{EMAIL}} if unsure.

Placeholders present (do not replace here):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for integration:
- This page references an SVG pattern at assets/img/pattern.svg for background texture. Ensure that file exists and is unique for this project.
- All copy-to-clipboard operations use the Clipboard API (navigator.clipboard). Running locally may require a secure context (https) or modern browsers to allow clipboard writes.
- There is no server-side processing — if you want real submissions, wire the form to your backend or a form service and replace the simulated behavior in contact.html.

Accessibility & behavior:
- Interactive widgets update visible regions and announce via aria-live where applicable.
- Safety guidance is intentionally conservative; update it according to your policies and legal counsel.

Design notes:
- The page follows a warm, storyteller tone and offers practical tooling — the planner and seat selectors are meant to reduce friction when booking or preparing for an event.

If you need the supporting SVG pattern (assets/img/pattern.svg) or further pages in this site bundle, ask for the next chunk and indicate any content or style changes you want.