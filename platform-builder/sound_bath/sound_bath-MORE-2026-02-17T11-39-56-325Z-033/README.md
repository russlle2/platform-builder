This chunk contains the contact page and a short README for the sound bath site.

Files included:
- contact.html : The site contact page used across the layoutFamily 'clinic_modern' and voiceFamily 'clinical_calm'.

Key features implemented in contact.html:
- Local navigation with unique labels linking to: index.html, events.html, private-sessions.html, pricing.html, about.html, book.html, contact.html.
- Contact form (no backend). On submit the form shows a confirmation message and prepares a mailto link for convenience.
- Proof Gallery: rotating testimonials with manual prev/next and auto-advance. Credibility badges show tooltips on hover.
- Micro Pricing Comparator: toggle between 'Monthly Membership' and '4-Session Package' with animated price transitions.
- Contraindications: responsible short list advising medical consultation where appropriate.
- Uses an SVG pattern via CSS background: url('assets/img/pattern.svg') — the SVG asset is expected elsewhere in the bundle.

Placeholders to be replaced elsewhere in the build:
- {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}

Notes:
- No external fonts, CDNs or images are used. All interactions are implemented with vanilla JS and inline CSS.
- Other site pages (events.html, pricing.html etc.) are referenced but not included in this chunk.

Testing:
- Open contact.html in a browser. The testimonial gallery should rotate automatically. Toggle pricing to see animated numbers.
- Submit the contact form to view the confirmation message.

Accessibility:
- Basic aria labels and roles are set on navigation, toggle, and badge lists for assistive tech.

If you need this page adapted for server-side form handling, add an action attribute to the form element and secure the backend endpoint accordingly.