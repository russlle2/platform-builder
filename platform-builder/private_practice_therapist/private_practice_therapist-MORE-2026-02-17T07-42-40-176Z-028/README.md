Contact page and interactive tools for the private practice site (chunk 4).

Files included:
- contact.html — The contact/connect page with two interactive tools: a Self-screening Intake Wizard and a Session Planner.

Purpose and features:
- Self-screening Intake Wizard
  - Non-diagnostic, clinician-framed questionnaire to capture current focus, duration, intensity, safety note, what has helped, and contextual details.
  - Two buttons: 'Create intake summary' and 'Generate questions to bring'. Each produces a plain-text summary in the output area that can be copied manually by the user.
  - Language and flow are designed to prepare a client for a productive intake without making clinical claims.

- Session Planner
  - Simple form to build a short-term plan: goal, cadence, session length, modality, budget note, and obstacle planning.
  - 'Build plan' renders a plaintext plan in the page.
  - 'Copy summary' uses the Clipboard API to copy the plan text to the clipboard (fallback is the download link).
  - 'Download' creates a text file (session-plan.txt) for the user to save.

Accessibility and behavior notes:
- Output areas use aria-live='polite' so screen readers announce new content when created.
- All controls are keyboard accessible. Details elements respond to Enter for toggle.

Placeholders to replace in the template:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}} (not used directly on this page but present across the site)
- {{PRIMARY_CTA_URL}} (same as above)
- {{CITY}}
- {{STATE}}

Clinician and safety language included:
- Confidentiality and scope statements are present in the sidebar and footer.
- Explicit crisis guidance: users are reminded this is not an emergency service and to contact local emergency resources if they are at immediate risk.

Implementation notes for developers:
- No external assets are required for these interactive tools. The page references assets/img/pattern.svg in the global project; ensure the unique SVG pattern exists in that path elsewhere in the bundle.
- All interactive behavior is implemented with vanilla JS within contact.html. No build step required.
- To test the copy feature, use a modern browser with Clipboard API support. The download link works in all browsers that support Blob URLs.

Styling and layout:
- Responsive two-column layout (main content + sticky sidebar) collapses to a single column on smaller screens.
- Visual accents use CSS gradients and a small inline SVG for decorative patterning.

Integration tips:
- Keep the safety and confidentiality language visible on other pages as well.
- Replace placeholders with real practice details before publishing.

Notes about privacy and ethics:
- The tools are explicitly non-diagnostic, intended to help clients prepare for conversation.
- Avoid storing submitted data on the page; the current implementation does not send form data to a server.

If you need a version of this page adapted to send intake summaries to a secure intake form or EHR, I can sketch a secure submission design that respects privacy and HIPAA-like constraints (note: this repository does not include any server-side secure submission code).