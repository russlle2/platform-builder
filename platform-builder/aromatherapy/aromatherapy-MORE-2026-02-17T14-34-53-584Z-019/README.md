Contact page — chunk 4

Files included:
- contact.html: Full contact + interactive widgets (Session Planner & Blend Builder)

Purpose
- This page is the connective hub: booking CTA, direct contact placeholders, and two local interactive tools that run completely in the browser (no server required):
  - Session Planner: gather intent, cadence, and notes; generates a plaintext plan summary that you can copy or download.
  - Blend Builder: pick a mood, carrier, and strength; produces a non-medical draft blend card and conservative dilution guidance, with copy and download.

Placeholders to replace in templates
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

How to test locally
1. Place this file in your project root or appropriate pages folder.
2. Ensure the site has the other pages referenced in the nav (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html).
3. Serve the folder with a static server (e.g., Python: python3 -m http.server) to avoid file:// clipboard/download quirks.
4. Open /contact.html in a browser.

Widget behaviors
- Session Planner:
  - Fill fields and press "Generate Plan" to create a plaintext summary.
  - "Copy summary" writes the text to clipboard; "Download .txt" saves it as a file.
  - Reset clears inputs.
- Blend Builder:
  - Choose a vibe, carrier, and strength then press "Draft blend".
  - The preview includes suggested oils (non-medical), a dilution note, and safety reminders.
  - Copy and download options produce a plaintext blend card.

Accessibility & safety
- All blend and session outputs include conservative safety reminders: patch test, pregnancy & pet considerations, and no medical claims.
- Replace placeholders with real contact details before publishing.

Notes
- The page references a local SVG pattern at assets/img/pattern.svg for subtle background texture; include a unique SVG at that path elsewhere in the project.
- Styling is intentionally self-contained with no external fonts or CDNs.

Developer notes
- All interactive logic is client-side vanilla JS within contact.html; functions are small and designed for straightforward integration with a backend intake form if needed later.
- To adapt copy or suggested oils, edit the 'suggestions' object inside the blend builder script.
