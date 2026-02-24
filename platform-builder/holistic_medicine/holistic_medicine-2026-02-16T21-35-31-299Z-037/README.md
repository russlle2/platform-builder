Contact page for the holistic / integrative medicine site (layoutFamily: clinic_modern, voiceFamily: mystic_modern).

What this file contains:
- contact.html: A standalone contact/connect page that includes the required section pack elements in a contact-focused order: hero, diagnostic snapshot (symptom checklist), plan/intake outline, micro-habits, pricing teaser, and a final CTA.

Design notes & behavior:
- Visuals rely on CSS gradients, glass-like cards, and a custom inline SVG pattern. There is an expectation that a separate unique SVG asset exists at assets/img/pattern.svg for other chunks; the page includes an embedded SVG for immediate visual richness and progressive enhancement.
- Navigation labels vary from other pages (Home, Offerings, Concerns, Method, Fees, About, Book, Connect) to satisfy subtle variation rules.
- The language avoids guarantees, emphasizes education and whole-person care, and includes an explicit disclaimer about not promising cures and directing to emergency services if needed.

Form & placeholders:
- The contact form posts to {{PRIMARY_CTA_URL}} (adjust as needed). Placeholders in the page include:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}
  - {{PRACTITIONER_NAME}}
  - {{CREDENTIALS}}

Accessibility & responsive design:
- Uses semantic form controls and labels.
- Responsive grid collapses to a single column at narrow widths.

Integration guidance:
- Ensure server-side handling for the form endpoint ({{PRIMARY_CTA_URL}}) or wire the form to your contact management/email workflow.
- Confirm that an assets/img/pattern.svg file is present in the project to match the unique SVG background requirement across the bundle.
- Update fee text and sliding scale statements on /pricing.html to match actual practice policies.

License & content policy:
- Content is educational and non-promissory; do not alter disclaimers that relate to medical urgency or guaranteed outcomes.

If you need this page adapted to accept a third-party scheduling widget or to integrate with a CRM (Zapier, Make, or direct API), tell me which provider and I will add the embed/snippet.