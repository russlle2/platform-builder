This folder contains the contact page and notes for the sound bath site chunk.

Files:
- contact.html: The contact/connect page for {{BUSINESS_NAME}}. Includes:
  - Contact form (local, non-submitting for demo).
  - Session Planner: interactive widget that builds a personalized plain-text session summary. Use the Build summary, Copy summary, and Download .txt controls to export.
  - Seat selector (fake/local): choose an event, click seats to select. Some seats are randomly shown as reserved.
  - Packing list generator: responds to gathering style, comfort preferences, and selected seats; copy the list with the Copy list button.
  - Contraindications & accessibility note included.
  - Primary action buttons use placeholders for {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}.

How to test locally:
1. Open contact.html in your browser.
2. Use the Session Planner: pick intention, duration, instruments (click chips), and add-ons. Click "Build summary" then "Copy summary" or "Download .txt".
3. In the Seat selector section: choose an event, click seats to select/deselect, and watch the selected seat count update.
4. Change the gathering style and comfort checkboxes to update the suggested packing list. Use "Copy list" to copy items to clipboard.
5. Click "Reserve with notes" to simulate sending the plan and seat choices to the booking URL configured in {{PRIMARY_CTA_URL}} (it will open the URL with a notes query parameter).

Notes for integration:
- The page references placeholders to be replaced by the site generator: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- The page expects an SVG pattern asset at assets/img/pattern.svg for broader site visuals, but the page functions without it.
- No external fonts or CDNs are used; styling is pure CSS and inline JS for interactivity.

Accessibility & safety:
- The site includes a responsible contraindications disclaimer. This is informational only and not medical advice.

Seed and layout hints used in this chunk: seed=2124221211, layoutFamily=earthy_warm, voiceFamily=warm_storyteller.
