# Contact page — {{BUSINESS_NAME}}

This chunk provides the contact page (contact.html) for an earthy_warm, executive_coach-toned private practice therapist website.

Files included:
- contact.html — the contact / connect page with an embedded avatar and organic pattern SVGs (inline), a contact form, phone/email, confidentiality and crisis disclaimers, scope and boundaries, links that "ripple" back to the Index sections: hero, values, methods, objections, testimonials, lead_magnet, cta.

Placeholders
- Replace these placeholders across the file with real values:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}} (optional in some templates)
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{THERAPIST_NAME}}
  - {{LICENSE}}
  - {{MODALITIES}} (used elsewhere)
  - {{CITY}}
  - {{STATE}}

Design notes
- Layout family: earthy_warm — warm gradients, rounded cards, organic inline SVGs.
- Tone: executive_coach — direct, supportive, practical.
- No external assets, fonts, or CDNs. All visuals are inline SVG.

Content & compliance
- Includes confidentiality/privacy note, crisis disclaimer, scope and boundaries consistent with clinical ethics.
- Avoids medical claims and absolute guarantees.
- Encourages responsible behavior: uses crisis instructions and referral guidance.

Development notes
- The contact form posts to {{PRIMARY_CTA_URL}}. Adjust action to your backend handler or form service.
- Links to index.html anchors (index.html#hero etc.) assume those anchors exist on the main index page.
- Replace placeholder links (privacy.html, terms.html) or remove if not needed.

Accessibility
- Form controls include labels via placeholders and aria-label on the form. Further accessibility improvements: explicit <label> elements, server-side validation feedback, and focus outlines for keyboard users.

Legal / Ethics
- Do not present therapy as guaranteed; keep language consistent with therapeutic standards.
- Keep client data secure; this template notes that messages will be stored securely but implement actual secure storage and transmission when deploying.

If you need the remaining pages (index, about, specialties, approach, fees, faq, book) or separate asset SVG files exported to assets/img/*, request the next chunk and I will produce them with unique SVGs for each template.