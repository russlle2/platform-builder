# private_practice_therapist-MORE-2026-02-17T07-53-46-127Z-031 (chunk 4)

This chunk includes two files for the site build:

- contact.html — The contact/connect page with two interactive tools:
  - Session Planner: build a simple plan (select goals, rhythm, length, format), view a plain-text summary, copy it, or download as .txt. No external services; uses clipboard and blob download APIs.
  - Self-Screening Intake Wizard: three-step reflection tool that produces a non-diagnostic question list and a short answers summary you can copy. Designed to help clients prepare for the first conversation.
  - A basic contact form that gathers name, email, phone, timing, and message. The handler simulates a send and shows a confirmation (local only).
  - Privacy/confidentiality and crisis notes are included.

- README.md — This file.

Placeholders included in contact.html that need to be replaced in the final build:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{CITY}}
- {{STATE}}

Accessibility & notes:
- Interactive elements use semantic controls and provide aria-live feedback for generated summaries.
- The planner and wizard are purely client-side. No external assets or CDNs are used; an inline SVG data URI provides a subtle background pattern.
- Content intentionally avoids clinical guarantees and emergency handling; a crisis note directs people to emergency services for urgent needs.

If you need this page adapted (different fields, export formats, or integration with a backend appointment system), tell me which endpoint or format to target and I will update the scripts accordingly.