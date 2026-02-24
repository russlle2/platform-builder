Project: holistic_medicine-MORE-2026-02-17T18-18-23-227Z-007

Files in this chunk:
- contact.html

Purpose:
- contact.html contains the interactive Session Planner and two whole-person inventory tools. These let users generate a plaintext consultation summary, a consultation agenda, and a suggested follow-up cadence. The page also includes contact placeholders for easy replacement.

Placeholders (replace before publishing):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (if used elsewhere)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Features implemented locally (no external services):
- Session Planner (primary widget): collects name, session intent, session length, urgency, and a whole-person inventory of focus areas. Clicking "Build plan" produces a plaintext plan that includes session timing breakdown, agenda, follow-up cadence, and checkpoints.
- Extended whole-person inventory (secondary): a second intake-focused flow that generates an agenda and cadence designed for a deeper intake.
- Copy/export: both tools support copying the generated plaintext to the clipboard using navigator.clipboard.
- Simple algorithmic recommendations: cadence is suggested from number of selected areas and urgency setting; session segment times are allocated from chosen session length.

Accessibility and notes:
- Controls include labels and simple ARIA-friendly outputs (aria-live via regular DOM text updates).
- The content includes an educational disclaimer; the tools are not diagnostic.

Design and files:
- The page references a local SVG pattern at assets/img/pattern.svg for background texture. Include a unique SVG at that path when assembling the full site.
- No external fonts or CDNs are used; all styles are inline in contact.html.

How to test locally:
1. Place contact.html in the site root with the other site pages.
2. Ensure assets/img/pattern.svg exists (or remove the background-image rule).
3. Open contact.html in a modern browser.
4. Use the Session Planner: fill fields, select areas, click "Build plan". The summary, agenda, and cadence will populate. Click "Copy" to export the plaintext to clipboard.

Developer notes:
- The plaintext format is intentionally simple, making it easy to paste into an email or patient note.
- Recommendation heuristics are basic and intentionally conservative; adjust the logic in the inline script to match clinical workflows or membership program rules.
- When integrating, replace placeholders server-side or via a static-site build step.

Licensing: deliverable is a template; adapt copy for local regulatory requirements. Ensure all clinical messaging complies with local guidelines.