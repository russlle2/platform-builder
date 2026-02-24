Contact page for the sound bath studio (zen_minimal, warm_storyteller voice).

Files included in this chunk:
- contact.html — The contact and info hub for members, prospective attendees, and private-session inquiries.

Notes & instructions:
- Placeholders remain in the file (e.g. {{BUSINESS_NAME}}, {{EMAIL}}, {{PHONE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{CITY}}, {{STATE}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{NEXT_EVENT_DATE}}). Replace them during build or runtime.
- The page includes the required section pack: hero, myth_vs_truth, pillars, case_notes, faq, cta.
- Visual richness is provided by CSS gradients, glass panels, and an inline unique SVG pattern. No external assets are referenced.
- Accessibility: semantic sections, headings, and labels are present. The contact form posts to /api/contact (adjust to your API endpoint).
- Sensory & safety content is present: 'what to bring', contraindications disclaimer, and session flow description.

Developer tips:
- If you need a separate SVG asset, extract the inline SVG from the .pattern-wrap element and save it as assets/img/pattern.svg for reuse.
- Adjust color variables in :root to tune the palette for brand alignment.
- The contact form is basic; enhance with client-side validation and spam protections (reCAPTCHA, honeypot) as desired.

This chunk intentionally only includes contact.html and this README to match bundle constraints.