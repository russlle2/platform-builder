Contact page and usage notes for the wellness_coach site (chunk 4).

Files in this bundle:
- contact.html — The site Contact page with two interactive features:
  1) Session Planner — build a compact session plan by entering name, outcome, session length, frequency, weeks, and focus areas. The planner builds a plaintext summary you can copy.
  2) 7‑Day Habit Challenge — create a short daily habit checklist for seven days. The generator renders a checklist, a text export, and prepares a printable version (use your browser Print to produce a paper copy).

Placeholders to replace:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

How to use the interactive widgets:
- Session Planner:
  • Fill the fields (name, outcome, session length, sessions per week, weeks).
  • Click focus chips to include them in the plan.
  • Press Build plan to generate a full plaintext plan in the summary area.
  • Copy summary copies the plan text to the clipboard.

- 7‑Day Habit Challenge:
  • Provide a habit name and daily target.
  • Choose a start day (or Today) and a difficulty.
  • Make checklist builds the interactive checklist and a text export box.
  • Print uses the browser print dialog and shows only the printable checklist.
  • Copy text copies the checklist text to clipboard.

Notes and constraints:
- All features are local JavaScript — no external services or APIs.
- No images or external fonts are used. The page references an SVG pattern at assets/img/pattern.svg for background continuity in other chunks; the Contact page works without it.
- The copy/print features use the Clipboard API and window.print(). Some browsers require secure context for clipboard write; fallback messages are provided.
- Content avoids medical claims and focuses on outcomes, habits, and frameworks.

Integration tips:
- Replace placeholders with real values before deploying.
- Ensure assets/img/pattern.svg exists in your project root (created in another chunk of the project) or remove references if unused.
- The navigation uses eight links matching the site pages: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html.

If you need a variant with a different tone, layout tweaks, or a downloadable text file export (instead of copy), ask for a quick update.