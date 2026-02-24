Contact page and features for the private practice therapist site (chunk 4).

Files included:
- contact.html — Complete contact page with inline SVG pattern, contact form (simulated submission), a brief self-screening intake wizard that generates a concise summary to bring to a first appointment, and a guided-practice modal that includes three short exercises (breathing, timed journaling, intention-setting).

Design notes:
- Visual: earthy_warm palette, warm neutrals and green accents. Unique inline SVG pattern is embedded in the document rather than as an external asset to keep the chunk self-contained.
- Navigation uses a different label set that maps to the site pages: Home, Who I Am, Focus Areas, Way of Working, Rates & Plans, Questions, Schedule, Connect.

Functional features (local JS only):
- Self-screening intake wizard:
  - Six short prompts (concern, duration, impact, helpful changes, short goal, additional notes).
  - Step navigation (Next / Back), produces a prepared summary, with options to copy or print the summary.
  - Intentionally framed as non-diagnostic, practical, and intended to support the first session.

- Guided-practice modal (Try it now):
  - Breathing practice: 2-minute guided circle animation and timed cues (no audio).
  - Journaling: 5-minute timed writing space with ability to save the text as a .txt file.
  - Intention-setting: prompts to compose a short intention and small actionable step.

Therapist / compliance considerations:
- The copy avoids medical claims and guarantees.
- Includes confidentiality, scope boundaries, and a clear crisis note directing users to emergency services when needed.
- Tone: clinical_calm — written to sound like a clinician: grounded, practical, and not coercive.

Integration notes:
- Primary CTA placeholders are present as {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}; business placeholders include {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}.
- The contact form simulates submission (alert). Replace submitContact() with a secure POST to a backend when integrating.
- The wizard uses simple DOM-based state; it intentionally does not record or send data. For production, ensure secure handling and explicit consent before storing intake information.

Accessibility & Behavior:
- Modal closes on backdrop click or Escape key.
- Keyboard-accessible controls are standard inputs and buttons.

Developer pointers:
- To enable real messaging or bookings, wire the contact form to a secure server endpoint and implement server-side validation and storage.
- Consider storing the intake wizard summary temporarily in a secure intake system if you need it pre-appointment; always document consent and retention policies.

This chunk contains only contact.html and this README.md as requested.