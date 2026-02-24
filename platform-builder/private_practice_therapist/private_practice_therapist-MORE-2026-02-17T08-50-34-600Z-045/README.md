Contact page and tools — chunk 4 for private_practice_therapist-MORE-2026-02-17T08-50-34-600Z-045

Files included:
- contact.html : The contact page with two local interactive tools: Session Planner and Self-screening intake (guided reflection). It also includes a contact form stub, practical notes about confidentiality, scope, and a crisis note.

Purpose of the page:
- Offer a calm entry point to contact the clinician and prepare for the first meeting.
- Session Planner: build a short plaintext plan, copy to clipboard, or download as a .txt file.
- Self-screening intake (guided reflection): 3-step wizard that produces a concise reflection and a short list of questions to bring to consultation; copyable to clipboard.

Placeholders used (must be replaced in deployment):
- {{BUSINESS_NAME}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes on behavior and constraints:
- All logic is local JS; no external services or network calls.
- The contact form does not submit to a server (intentional stub). The submit button shows a draft message the user can copy into their email client.
- Session Planner exports a plaintext summary and supports copy + download.
- The guided reflection is non-diagnostic, supportive, and produces "Questions to bring" — suitable for preparing a consultation.

Therapist/legal content:
- The page includes confidentiality and scope language and a crisis note; there are no medical claims or promises of outcomes.
- Avoids manipulative scarcity language.

Design notes:
- Minimal, poetic copy voice and a soft, muted palette.
- Pattern is embedded via an inline data-URL SVG for subtle visual texture (no external assets required in this chunk).

How to test locally:
1. Open contact.html in a browser.
2. Use the Session Planner: choose options, write notes, click "Build plan" then try "Copy summary" and "Download .txt".
3. Use the wizard: complete steps, click "Finish" then "Copy questions for consultation".
4. Try the contact form stub and observe the draft popup.

Accessibility & small details:
- Forms have simple labels and aria-live on the plan output for polite updates.
- The page is responsive and stacks to a single column on narrow viewports.

If you need the separate SVG asset saved as assets/img/pattern.svg, copy the SVG content from the background data URI in contact.html and save it to that path. 