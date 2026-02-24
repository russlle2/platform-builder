Contact page and interactive tools for the wellness_coach site (chunk 4).

Files in this chunk:
- contact.html — full page with contact form stub, Session Planner widget, and 7-day Habit Challenge builder. Contains all HTML, CSS, and JS inline; no external assets.

Interactive features:
- Session Planner: set a focus, length, cadence, and start date. "Create plan" composes a plaintext plan summary in the output area. Use "Copy" to copy to clipboard and "Download .txt" to save a file.
- Habit Builder: enter a habit name and intensity, then "Generate 7-day checklist" to populate a 7-day printable checklist. "Print checklist" opens a print-friendly window and triggers the browser print dialog. "Export text" copies a plaintext checklist to clipboard.

Placeholders present in the HTML (replace as needed):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes:
- This page avoids external fonts, images, and CDNs. Visual texture uses an inline SVG pattern.
- The contact form is a demo/stub and does not submit to a backend.
- No medical claims are made on the page; the content focuses on outcomes, habits, and simple frameworks.

Testing tips:
- Open contact.html in a browser and try the Session Planner and Habit Builder flows.
- For printing, allow popups as the print view opens a new window.