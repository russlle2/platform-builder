Contact page and interactive features — chunk 4

Overview:
- Files in this chunk: contact.html and README.md
- Purpose: provide the site contact interface with two local interactive features: a Sound Preference Mixer and a Proof Gallery with rotating testimonials and credential badges.

contact.html details:
- Header: site-branding and navigation (labels differ from common templates: Gatherings, Private, Our Thread, Q&A, Reach).
- Hero: short poetic lead and primary CTA (uses placeholders: {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}).
- Contact form: collects name, email, phone, city and notes. Includes an explicit contraindications notice (important safety requirement).
- Sound Preference Mixer: three choices (Gentle, Medium, Intense). Selecting a level updates the recommended program list and the small recommendation label.
  - Implementation: plain JS toggles active state on buttons and replaces the program list in the DOM. No network calls are made; selections are logged to the console for debugging.
  - QuickBook: demonstrates a local flow that reads the selected preference and alerts the user.
- Proof Gallery: rotates testimonials on a 4.2s interval. Includes Prev, Next, and Pause buttons. Three credibility badges sit to the side; each badge exposes a tooltip on hover/focus.
  - Implementation: setInterval rotation, pause toggle, accessible focus states for badges, aria-live to announce testimonial changes.
- Accessibility: keyboard focus states for badges, aria-live on testimonial text, semantic form controls, and color contrast tuned for dark UI.

Styling & visuals:
- No external assets or fonts are used.
- Background pattern is embedded inline via a data URL SVG for visual texture (no external file). If you prefer a separate file, replace the data URL with assets/img/pattern.svg and add that file to the project.

Placeholders to fill in when deploying:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

How to test locally:
1. Save contact.html to a local folder and open it in a browser.
2. Interact with the mixer (Gentle/Medium/Intense) and observe the recommended program list updating.
3. Use the Proof Gallery controls (Prev / Pause / Next) and hover/focus the badges to see tooltips.
4. Submit the form — it will not send network requests; instead it logs the payload to the console and shows an alert.

Notes & implementation choices:
- The page intentionally uses a minimal poetic tone in copy to match the voice family.
- Contraindications are included to meet safety requirements. Encourage attendees to use the notes field for relevant health information.
- The code is local-only and minimal; adapt the form submission and booking flows to your backend when ready.

Seed / Metadata (for reference):
- Slug: sound_bath-MORE-2026-02-17T10-51-30-721Z-022
- Seed: 315747178
- layoutFamily: poster_hero
- voiceFamily: minimal_poetic
- offerModel: hybrid
- sectionPack: hero,myth_vs_truth,pillars,case_notes,faq,cta

If you need additional pages from this project (index, events, private-sessions, pricing, about, faq, book), they are part of the full site but not included in this chunk. Replace placeholders before publishing.