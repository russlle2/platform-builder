Project: sound_bath (slug: sound_bath-2026-02-16T13-09-22-951Z-028)

Overview:
This bundle contains the contact page and a README for a small sound bath events website. The design direction is "earthy_warm" with a "minimal_poetic" voice. The contact page is intentionally sensory and premium-feeling, focusing on clarity, warmth, and accessibility.

Files in this chunk:
- contact.html — the connect / contact page with hero, contact form, what-to-bring, session flow, contraindications, FAQ, and CTA.
- README.md — this file with usage notes.

Placeholders (replace these with actual values):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{FACILITATOR_NAME}}
- {{VENUE_NAME}}
- {{NEXT_EVENT_DATE}}

Design notes & developer tips:
- Visuals: the page relies solely on CSS gradients and an inline SVG pattern embedded as a data URI for the soft repeating texture. No external images, fonts, or CDNs are used.
- Pattern: If you prefer a separate SVG asset, create assets/img/pattern.svg and paste the SVG markup from the inline data URI in contact.html. Update the CSS to reference /assets/img/pattern.svg instead of the data URL.
- Form: the form posts to {{PRIMARY_CTA_URL}}. Update the action to your booking endpoint or serverless function. The markup is simple; add validation or anti-spam as needed.
- Accessibility: headings are semantic and inputs include native labels/placeholder text. Consider adding aria attributes if integrating complex JS.
- Responsive: the layout stacks on small screens. Test at common breakpoints.

Content guidance (editorial):
- Maintain the minimal poetic tone: short evocative sentences, sensory cues, and clear practical instructions.
- Keep the safety/contraindications language intact to protect participants and the facilitator.
- Swap instrument lists and metaphors across other pages to meet the uniqueness requirement—this contact page intentionally focuses on process rather than instrument detail.

How to preview:
1. Place contact.html alongside the other site pages (index.html, events.html, etc.).
2. Open contact.html in a browser (double-click or host with a simple static server like `npx serve`).

Further customization:
- To add a localized map, embed a static SVG map or implement a server-side tile snapshot—avoid external map services if you want this bundle to remain self-contained.
- To support multiple facilitators or venues, consider adding a small CMS or JSON file that the page can consume and render server-side or at build time.

Notes about site consistency:
- Navigation labels were chosen to vary subtly from other templates (e.g., "Gather" instead of "Home"). When generating the rest of the pages, ensure headings and section order are unique across templates to satisfy the uniqueness constraints.

License & author:
Created by a senior web designer + front-end engineer. Use and adapt freely within your project.