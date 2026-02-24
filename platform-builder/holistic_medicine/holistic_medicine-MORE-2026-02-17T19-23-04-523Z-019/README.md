Contact page for holistic_medicine site — chunk 4

This bundle contains two files for the contact page and developer notes.

Files:
- contact.html — Full contact/connect page with two interactive tools:
  1) Session Planner: build a short, plaintext session summary you can copy or download. Fields include primary goal, session type, duration, follow-up rhythm, and client notes. Click "Plan my session" to generate a ready-to-share text block. Copy and Download buttons are provided.
  2) Whole-person inventory: a checklist of life areas (sleep, nutrition, movement, stress, relationships, work, environment, spirituality, symptoms, medications). Click "Generate agenda" to produce a prioritized consultation agenda and a suggested follow-up cadence. Copy and Save (localStorage) actions available.

Design notes:
- Layout family: earthy_warm, warm_storyteller voice.
- Nav label set differs from default: Start, Offerings, Conditions, Method, Investment, Our Story, Book a Visit, Connect.
- Uses placeholders that must be replaced at build or runtime: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- No external assets; background references assets/img/pattern.svg (unique SVG expected in another chunk).
- Tone and copy follow educational, non-curative guidance; includes a safety disclaimer in the UI.

Developer notes:
- All interactions are client-side. No server required.
- Copy uses navigator.clipboard; Download uses Blob and object URLs.
- "Save as note" stores the generated agenda in localStorage with a timestamp key.
- To change labels, update the HTML nav or button text.

How to run locally:
1) Place this file alongside the rest of the site files and ensure assets/img/pattern.svg exists in that path.
2) Open contact.html in a modern browser (Chrome, Edge, Firefox, Safari).
3) Use the Session Planner and Whole-person inventory to produce text outputs. Use the Copy or Download buttons to export.

Accessibility:
- Outputs use aria-live and semantic elements.
- Buttons are keyboard accessible. Cmd/Ctrl+Enter in the notes field triggers the planner build.

Notes on constraints:
- This chunk intentionally only includes contact.html and this README. The global site includes other pages listed in the project brief.
- The page avoids certain recent headline phrases as requested and keeps unique metaphors and CTA phrasing (e.g., "Plan my session").

If you need an alternate export format (PDF or printable layout), I can add a client-side print stylesheet or a small JS routine to format the text for printing.