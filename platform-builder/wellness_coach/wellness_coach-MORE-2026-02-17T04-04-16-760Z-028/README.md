This chunk provides the contact page and notes for the wellness coach site (layoutFamily: aura_editorial, voice: clinical_calm).

Files included:
- contact.html — The contact page with an integrated "Session Planner" interactive widget and a scroll-triggered section reveal system.
- README.md — This document.

Placeholders to replace in contact.html:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used on this page but present across the project)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented locally (no external libs):
- Scroll-triggered reveal: elements with the data-reveal attribute animate into view. Respects prefers-reduced-motion by revealing immediately.
- Session Planner widget: build a four-week plaintext plan based on user inputs (focus, session length, frequency, current rating, approach). The plan appears in a readonly textarea and can be copied to clipboard via the Copy summary button. Uses navigator.clipboard with a fallback to document.execCommand.
- A minimal contact form UI (demo behavior only; no server integration).

Notes & usage:
- The page references assets/img/pattern.svg for decorative background. Ensure that asset exists in the project.
- No external fonts or CDNs are used. All styling is inline in contact.html.
- Content deliberately avoids medical claims; it focuses on habits, frameworks, and outcomes.

Accessibility:
- Reduced-motion preference is respected.
- Buttons and form fields are keyboard-accessible.

Customization:
- Update placeholder tokens with real business values.
- Integrate the contact form with your backend in the form handler section in contact.html.

Chunk: wellness_coach-MORE-2026-02-17T04-04-16-760Z-028
Seed: 1958646789
Layout family: aura_editorial
Voice: clinical_calm
Offer model: membership
Section pack elements considered: hero, diagnostic, plan, micro_habits, pricing, cta (this page focuses on plan/contact).
