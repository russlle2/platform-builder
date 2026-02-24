# sound_bath-2026-02-16T11-42-30-547Z-007

This chunk contains two files for the Contact page of the "sound_bath" project.

Files included:
- contact.html — the contact & booking page with hero, diagnostic, plan, micro_habits, pricing, and cta sections (all required section pack).
- README.md — this file.

Design notes & customization:
- Visuals are produced with pure CSS gradients and an inline SVG pattern (no external assets or fonts). The SVG is embedded in contact.html to ensure a rich background without additional files.
- The layout follows the "bold_playful" aesthetic with high-contrast gradients, rounded panels, and strong CTAs; copy voice is a practical guide with sensory + premium cues.
- Placeholders present in the markup: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{NEXT_EVENT_DATE}}. Replace these server-side or with your templating engine.

Contact form:
- The form posts to {{PRIMARY_CTA_URL}}. Replace with your form endpoint or serverless function URL. Alternatively, use a mailto: link or integrate with your preferred backend.
- For VIP Day inquiries, use the provided CTA and indicate in the intake that you want a full-day bespoke proposal.

Accessibility & safety copy:
- The page includes a short contraindications disclaimer and notes on "what to bring" and session flow (welcome, immersive sound, re-entry, follow-up). Keep these up-to-date for legal and safety compliance.

Style guide:
- Color variables are at the top of the inline stylesheet for easy adjustment.
- The page avoids external dependencies; you can extract the CSS to a shared stylesheet if combining with other pages.

Implementation tips:
- Ensure server-side sanitization of form inputs if you implement a direct POST endpoint.
- If you need the separate assets/img/pattern.svg for global reuse, extract the <svg> element from contact.html and save it to that path; update CSS to use it via background-image or <img>.

Voice & copy variations:
- This contact page uses a helpful, practical tone and varies nav labels (Gatherings, Soon, Private, Investment, Learn, Connect) to maintain distinction from other templates.

If you need additional pages (index, events, private-sessions, pricing, about, faq, book) or a separate SVG asset file, I can generate those in subsequent chunks.