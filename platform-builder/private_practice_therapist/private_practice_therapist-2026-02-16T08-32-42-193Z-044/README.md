This chunk contains two files for the private practice therapist site (layoutFamily: aura_editorial).

Files included:
- contact.html — Full contact page with hero, social proof, benefits, process overview, FAQ snippets, lead-magnet CTA, contact form, confidentiality and crisis disclaimers, and therapist details.
- README.md — This file (instructions and notes).

Placeholders to replace before publishing:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{THERAPIST_NAME}}
- {{LICENSE}}
- {{MODALITIES}}
- {{CITY}}
- {{STATE}}

Notes and guidance:
- The contact form posts to {{PRIMARY_CTA_URL}}. Replace with your form endpoint or an appointment booking URL, or update the form to use a backend handler.
- Assets referenced in the HTML (assets/img/avatar.svg, assets/img/hero.svg, assets/img/pattern.svg) should be provided locally in the assets/img/ directory. Each SVG should be unique and created for this project.
- The page intentionally avoids claims about cures or guarantees. It includes confidentiality and crisis disclaimers that must remain visible.
- Styling is inline and crafted for an "aura_editorial" aesthetic: high-contrast, bold typographic scale, calm accent color. Adjust CSS variables at the top of contact.html to tweak colors and spacing.

Accessibility & ethics reminders:
- Keep the crisis and emergency language intact. Do not present therapy as emergency intervention.
- Ensure any downloadable lead magnet respects client privacy (no collection of protected health information without consent).

How to preview locally:
1) Place contact.html and README.md in a folder.
2) Add the referenced SVGs into assets/img/.
3) Open contact.html in a browser.

If you need the other pages in this site (index, about, specialties, approach, fees, faq, book), ask for the remaining chunks. Each page will use the required section pack (hero, social_proof, benefits, process, faq, lead_magnet, cta) and maintain consistent placeholders and tone.