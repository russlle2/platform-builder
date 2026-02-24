Contact page and feature notes for wellness_coach-MORE-2026-02-17T03-48-06-564Z-024

Files in this chunk:
- contact.html — interactive contact and planning page.

Purpose:
- Provide a calm, clinical-facing contact page for a membership-driven wellness coach site.
- Let visitors express current state and immediately see a recommended approach.
- Allow visitors to select goals and receive a simple 30-day path map with milestones and an estimated completion score.

Key interactive features implemented (pure HTML/CSS/JS, no external services):
1) Mood-to-Method selector
   - Buttons represent current states (Overwhelmed, Low energy, Restless, Focused, Steady).
   - Clicking a mood updates the method card copy and changes the primary CTA text to a tailored phrase.
   - The initial CTA label uses the placeholder {{PRIMARY_CTA_LABEL}} so server-side systems can replace it when needed.

2) Progress meter / Path map
   - Users select goals via checkboxes (sleep, movement, stress, focus, hydration, meals).
   - "Build path" generates a compact 5x6 grid representing 30 days, and marks distributed milestones tied to selected goals.
   - A progress estimate is calculated from the number and type of goals and updates a progress bar and summary.
   - The CTA text adjusts based on how many goals were selected to suggest an appropriate membership entry point.

3) Contact form
   - Lightweight client-side validation and confirmation alert. No backend integration is included here.

Accessibility & notes:
- The mood area updates are announced via simple content changes; the method card has aria-live behavior via DOM updates.
- No images, external fonts, or CDNs used. A small inline SVG provides visual texture for the page corner.
- Placeholders included and required by the generator: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Design choices consistent with the brief:
- Clinical, calm voice with concise guidance and clear affordances.
- Membership model emphasized via CTA phrasing and suggested rhythms in the method copy.
- No medical claims; all language focuses on routines, habits, and frameworks.

Integration tips:
- Replace placeholders server-side or via a templating engine before serving.
- The contact form is intentionally isolated from backend logic; wire the form submit to an endpoint if you want persistence.
- If you add an assets/img/pattern.svg in a later chunk, consider replacing the inline corner SVG with that asset for consistent branding.