Sound Bath — Contact page (chunk 4)

This bundle contains two files for the contact page of the sound bath site (layoutFamily: earthy_warm, voiceFamily: warm_storyteller, offerModel: membership).

Files included:
- contact.html   -> The full contact page with inline SVG background pattern, form UI, membership info, what-to-bring, contraindications, and session flow.
- README.md      -> This file.

Usage:
1. Replace placeholders in the HTML with real values:
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
   - {{NEXT_EVENT_DATE}} (if referenced elsewhere)

2. Hook the contact form to your backend by changing the form action and method as appropriate.

Design notes:
- Visual richness is achieved through CSS gradients, shadows, and an inline SVG pattern (no external assets).
- Tone: warm storyteller; copy emphasizes sensory, premium experience and membership benefits.
- Safety: contact.html includes a contraindications disclaimer and accessibility notes.

Accessibility & best practices:
- Labels are associated with inputs; color contrasts are kept warm but readable.
- Provide server-side validation and anti-spam measures on the form.
- Ensure event pages and private-sessions pages referenced in nav exist and follow unique section orders and headings (do not reuse exact headings across templates).

If you need an external SVG file at assets/img/pattern.svg, you can extract the inline <svg> element from contact.html and save it there. Otherwise the inline pattern renders the same visuals without external requests.

Chunk seed: 3423835719
Layout: earthy_warm
Voice: warm_storyteller
Offer model: membership

End.