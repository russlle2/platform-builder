Contact page for the "sound_bath" site (chunk 4)

Overview:
- File: contact.html — a complete, standalone contact page styled for a premium sound bath membership offering.
- Purpose: capture inquiries for events, memberships, private sessions (1:1, couples, corporate) and provide practical pre-session guidance.

Design notes & requirements satisfied:
- Layout family: split_diagonal implemented with a diagonal decorative panel and an inline SVG pattern for visual richness.
- Voice: warm_storyteller reflected in micro-habits, polite diagnostic language, and gentle CTAs.
- Offer model: membership emphasized (membership pill, pricing snapshot, membership CTA).
- Required sections included: hero, diagnostic, plan (flow), micro_habits, pricing, cta.
- Sound-bath specifics: includes "what to bring" guidance, contraindications disclaimer, and a short description of the session flow.
- Accessibility: semantic HTML, form controls labeled.

Placeholders (to replace before deployment):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (optional — not directly used in this file but may be added)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{FACILITATOR_NAME}}
- {{VENUE_NAME}}
- {{NEXT_EVENT_DATE}} (not used on this page but present site-wide)

Integration & customization tips:
- The contact form currently provides local feedback but does not send to a server. Replace the form submit handler with an AJAX POST to your backend endpoint or integrate with a serverless mailer.
- The page uses only embedded CSS and an inline SVG — no external images, fonts, or CDNs.
- To add analytics or full form processing, hook into the form submit event in the <script> block near the bottom.
- The SVG pattern is unique to this page and intentionally low-contrast. If you create assets/img/pattern.svg for other pages, make it visually distinct.

Editing guidance:
- Colors and gradients are in :root for quick updates.
- Header nav labels vary across site pages; ensure links remain correct when copying elements to other templates.
- Pricing section is intentionally a short snapshot. Full pricing details live on pricing.html and private-sessions.html.

Deployment:
- Drop this file into the root or appropriate templates folder of your static site.
- Replace placeholders with real content before publishing.

Contact for further edits:
- If you want alternate instrument lists, sensory metaphors, or a stricter accessibility audit, update the copy and test with a screen reader.

Seed: 1117861155
Layout family: split_diagonal
Voice family: warm_storyteller
Offer model: membership

Generated as chunk 4 of the site build.