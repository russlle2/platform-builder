# holistic_medicine-MORE-2026-02-17T19-07-44-129Z-016 — chunk 4

This bundle contains two files for the holistic_medicine site (layoutFamily: zen_minimal, voiceFamily: playful_premium):

- contact.html — Contact page with two interactive local widgets: Session Planner and Whole-person Inventory. These are client-only, no external services.
- README.md — This file (you are reading it).

Purpose
- Provide a contact interface and lightweight planning tools for visitors to draft a session plan and create a consultation agenda from a life-area inventory.
- The page is intentionally self-contained (HTML + CSS + JS) so it can run locally or be dropped into a static site host.

How to test locally
1. Place this file in your site folder alongside the other site pages (index.html, services.html, etc.).
2. Ensure the placeholder assets path exists or update references:
   - Pattern background: assets/img/pattern.svg (unique pattern expected elsewhere in the build). If the SVG is missing, the page still renders but without that background tile.
3. Open contact.html in your browser.

Widgets
- Session Planner: Fill goal, constraints, weeks, frequency, pick modalities and style chips. Click "Build plan" to generate a plaintext plan in the results box. Use "Copy" to place it on the clipboard.
- Whole-person Inventory: Check life areas you want prioritized and click "Compose agenda". The widget generates a suggested consultation agenda plus a follow-up cadence. "Copy" copies the text.

Notes
- All copy uses placeholders (e.g., {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}) — replace with project values during templating.
- The page intentionally avoids medical guarantees and uses educational language. If you integrate backend messaging, ensure HIPAA or regional privacy requirements are followed.
- No external fonts, images, or CDNs are used here.

Customization ideas
- Hook up the contact form to an email service or serverless endpoint.
- Persist planner/inventory outputs to localStorage or allow export as .txt.
- Enhance accessibility: add aria-live for result panels and better focus management for chip controls.

License & credits
- Generated for the holistic_medicine project. UI and behavior are provided as-is for integration into the full site build.
