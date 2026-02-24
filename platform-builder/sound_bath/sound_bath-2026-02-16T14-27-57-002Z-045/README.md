# sound_bath — contact page

This bundle contains the contact page and usage notes for the sound bath site (chunk 4).

Files:
- contact.html — full contact page with required sections: hero, myth_vs_truth, pillars, case_notes, faq, cta.

Site details:
- Niche: Sound Bath Events (sound_bath)
- Slug: sound_bath-2026-02-16T14-27-57-002Z-045
- Seed: 1371205174
- layoutFamily: clinic_modern
- voiceFamily: clinical_calm
- offerModel: hybrid

Placeholders to replace in templates:
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

Notes:
- The contact page emphasizes safety, sensory details, and clinical clarity. It includes a contact form (mailto-based action by default), instrumental palette, what-to-bring guidance, contraindications disclaimer, and a clear description of session flow.
- Visual richness is implemented via CSS gradients, shadows, glass panels, and a patterned SVG referenced at /assets/img/pattern.svg. Provide that asset in your build to match the design.
- Navigation labels are intentionally subtle and varied (e.g. "Gather", "Sessions", "1:1 & Private", "Tuition") — adjust if you change site-wide copy.
- This chunk intentionally avoids external fonts or CDNs; include fonts locally if desired.

Accessibility & build:
- Headings and landmarks are added for screen readers.
- The contact form is simple; integrate server-side handling or connect to your booking system by changing the form "action" attribute.

License: internal template for {{BUSINESS_NAME}} — adapt copy for your legal and medical disclaimers as needed.