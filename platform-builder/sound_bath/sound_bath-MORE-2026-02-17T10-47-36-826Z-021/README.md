Contact page and instructions

This chunk includes two files for the sound bath site (layoutFamily: clinic_modern, voiceFamily: playful_premium).

Files:
- contact.html — A complete contact + proof gallery page with interactive features:
  - Sound preference mixer (gentle / medium / intense) that updates recommended program cards and stores the selection on the contact form.
  - Proof Gallery that rotates testimonials automatically, with manual Prev/Next and dot controls; hovering the gallery pauses rotation.
  - Credibility badges with accessible tooltips (appear on hover/focus).
  - Contact form that collects name, email, group info and message; it includes a hidden field with the chosen sound preference. The form is a static demo — submits trigger a local alert. Replace with server endpoint as needed.
  - Contraindications/health disclaimer included near the form.
  - Navigation uses an alternate label set (Gatherings, Calendar, Private, Investment, Story, Answers, Join the Wave, Connect).
  - Visual accent references assets/img/pattern.svg as a background strip (unique SVG pattern expected to live at that path in another chunk).

Notes for local testing:
- Open contact.html in a modern browser.
- No external resources are required; all JS/CSS is inline. The page references assets/img/pattern.svg — for full fidelity include an SVG at that path in the project.
- The page uses placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}. Replace them during templating.

Developer guidance:
- To integrate form submission, replace the submitForm() handler logic with an XHR/fetch to your server API and handle validation/response accordingly.
- Testimonials and program recommendations are defined in simple arrays near the top of the script for easy editing.
- The mixer updates recommendations and sets the hidden input named "selectedMode" so downstream booking endpoints can receive the user's preference.

Accessibility:
- The mixer buttons use aria-selected and role="tab" semantics; badges expose tooltips on focus/hover.
- Live region cues are provided via aria-live on the proof gallery wrapper.

This chunk intentionally ships only contact.html and this README. Other assets (SVG pattern) and site pages are expected in other chunks of the build.