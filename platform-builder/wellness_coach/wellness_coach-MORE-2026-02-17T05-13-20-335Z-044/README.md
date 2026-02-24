Contact page for the wellness_coach site (slug: wellness_coach-MORE-2026-02-17T05-13-20-335Z-044).

Files in this bundle:
- contact.html — the contact page with two interactive features: a 7-day habit builder (printable checklist) and a guided practice modal (breathing, journaling, intention-setting).

Placeholders to replace in contact.html:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (optional, not used directly here)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features and how to use them locally:
1) Habit builder (7-day challenge)
   - Use the "gentle preset" to populate editable inputs, or manually edit the habit entries.
   - Choose a start day from the dropdown (Start Monday...Start Sunday).
   - Click "Generate checklist" to produce a table with 7 days and checkboxes for each habit.
   - Click "Print or save" to open a print-ready window; use the browser print dialog to save as PDF or print.
   - "Suggest a starter" pulls a small heuristic preset based on the message field and fills the inputs.

2) Guided practice modal
   - Open via the "Try a practice" button or any of the small "Try breathing / Try journaling / Set an intention" buttons in the sidebar.
   - Breathing: a simple 4-4-4 cycle with an animated circle and labels. Start/Stop controls.
   - Journaling: choose a prompt, start a 3-minute timer (counts down), write in the textarea, and save entries that will appear beneath.
   - Intention: quick capture of a simple intention; saved items are listed below.

Accessibility & behavior notes:
- Modal traps are minimal: Escape closes, clicking backdrop closes, and the panel is focusable.
- All interactive features are implemented in plain JavaScript — no external libraries or CDNs.
- No external assets are bundled here. The page references an SVG pattern at assets/img/pattern.svg for background texture; ensure that file exists and is unique for this project.

Customization suggestions:
- Replace placeholders with real values.
- Adjust the preset habits and prompts to match your coaching language.
- Hook the contact form and CTA to your backend or scheduling solution ({{PRIMARY_CTA_URL}} is included as a link target).

Design notes:
- Layout follows a quiet, minimal aesthetic that supports short guided UX moments and printable artifacts.
- Keep interactions simple and short; the intent is to encourage small daily practices, frameworks, and habit formation (no medical claims).

If you need a matching assets/img/pattern.svg (unique SVG pattern) created for this project, let me know and I will provide a lightweight inline SVG file to drop into that path.