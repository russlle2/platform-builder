# contact.html and project notes

This chunk contains the contact page and usage notes for the aromatherapy site.

Files included:
- contact.html — Complete contact page with two interactive tools built in plain HTML/CSS/JS.

Key features implemented on contact.html:
- Header with nav (labels: Welcome, Offerings, Custom Blends, Botanical Shop, Investment, About, Reserve, Contact). Links point to the site root pages.
- Contact form that collects name, email, phone, reason, and message. Form uses a simple client-side handler that simulates submission.
- Session Planner widget:
  - Select session type, focus, duration, mode, and free-form notes.
  - "Build plan" assembles a plaintext plan summary shown in a monospace-styled panel.
  - Copy to clipboard and Download .txt functions are provided.
  - Summary includes safety-forward reminders (patch testing, pets, pregnancy) and explicitly avoids medical claims.
- Blend Builder widget:
  - Choose a vibe (Calm, Focus, Sleep, Uplift), bottle size, and use (topical or diffusion).
  - Generates a non-medical "blend card" with ingredient suggestions, a conservative dilution percentage, estimated drops, and usage/safety notes.
  - Copy card button copies to clipboard.
- FAQ includes dilution/patch test/pets/pregnancy notes to remain safety-centric and non-medical.
- Visuals are achieved with local CSS and a reference to assets/img/pattern.svg for a subtle header pattern (no external fonts or CDNs).

Placeholders included (please replace as needed):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Safety & compliance notes:
- All language avoids medical claims and uses supportive phrasing. Session Planner and Blend Builder include safety reminders.
- Dilution guidance is conservative and illustrative; always recommend patch tests and professional counsel where appropriate.

How to use locally:
1. Place this file within the site folder alongside the other HTML pages (index.html, services.html, etc.).
2. Ensure the project has assets/img/pattern.svg for the header background (this file is referenced but not included in this chunk).
3. Open contact.html in a modern browser. The interactive widgets run entirely in the browser — no server necessary.

Notes for developers:
- The blend drop calculation uses an approximation of 20 drops per milliliter; adjust if your dropper spec differs.
- The Session Planner exports a plaintext summary suitable for copy/paste or saving as .txt for sharing.
- Keep the safety copy up-to-date if any legal or professional standards change.

Design voice: mystic_modern, safety-first, and tailored toward an "intensive" service model. This page uses clear CTAs and utility-first widgets to encourage contact and exploration without making health claims.