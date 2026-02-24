# contact.html — Sound Bath site (contact)

This bundle contains the contact page for the sound bath site (slug: sound_bath-MORE-2026-02-17T10-28-56-229Z-017).

Files included in this chunk:
- contact.html — complete page with UI, styles, and client-side interactions.

Placeholders used (please replace when deploying):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Features implemented in contact.html
- Local (fake) seat selector — holds seats locally and updates available seat count. Buttons:
  - "Hold" keeps a tentative local hold.
  - "Reserve a spot" simulates a reservation and reduces the local open seats.
- What to bring (packing list) generator — choose session length, posture, and cushioning preference to generate a suggested list. Can copy to clipboard.
- Try it now: guided micro-practice modal — three stages (breathing visual, short journaling, intention selection). Runs purely in-page JS, no audio. Includes keyboard accessibility (Escape to close) and simple animations.
- Contraindications disclaimer included and visible near booking controls.
- Nav uses alternate labels: Gatherings, Private, Origins, Invest, Learn, Connect (links match pages in site map).

Notes and integration
- The page references an SVG pattern at assets/img/pattern.svg for the subtle background. Ensure that file is present in your assets directory.
- Primary CTA uses placeholders {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}} — the primary contact button will redirect to that URL or fall back to a mailto using the email field.
- The seat selector and reservation flow are local-only demos to illustrate UX; they do not communicate with a server. Replace with API hooks as needed.

Accessibility and content
- Modal is marked with role and aria attributes and can be closed with the Escape key or by clicking outside.
- The page includes a responsible contraindications statement. Update medical advisories to match your legal and clinical guidance.

Customization
- Replace placeholder values at build time or via a templating step.
- Adjust times and next-event copy in the next-event module.

If you need the SVG pattern (assets/img/pattern.svg) or other pages (index.html, events.html, etc.), request the next chunk and I will provide them.
