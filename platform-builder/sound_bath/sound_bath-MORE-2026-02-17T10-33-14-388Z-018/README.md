# Contact Page — sound_bath (chunk 4)

This bundle contains two files for the contact page and developer notes.

Files:
- contact.html — The full contact page with interactive components.
- README.md — This file.

Placeholders present (replace as needed):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented locally (no external assets):
- Contact form stub with local validation and a simulated-send response.
- Pricing Comparator: toggle between "Monthly" and "Package". Numbers animate using requestAnimationFrame and an ease-out function.
- Mood-to-Method selector: pick a mood -> the method panel morphs and the CTA label and URL update accordingly.
- Safety & accessibility notes including contraindications guidance.
- A simple next-event spotlight linking to events.html.

Developer notes:
- Navigation uses unique labels and correct links for site pages: index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html, contact.html.
- The page uses inline styles and scripts for portability.
- Pricing numeric elements use data attributes data-month and data-package; adjust values there to change pricing.
- Mood mapping is defined in the moodMap object inside the page script; add or adjust entries to change suggested methods and CTAs.
- The contact form is a client-side stub. Replace with your backend endpoint or integrate with a form service as required.

Accessibility:
- Interactive elements have basic ARIA attributes and live regions for updates.
- Color contrast favors legibility; adjust CSS variables for theming.

Notes on safety text:
- Contraindications are advisory and intentionally concise. If you need legal wording or medical disclaimers, consult an appropriate professional.

Build:
- Drop these files into the project root (or the site build output) and wire up server-side handlers if you want form submissions to post to a backend.

Design provenance:
- Layout family: lux_gallery
- Voice: executive_sharp
- Offer model: vip_day
- Section pack present on the site includes: hero, diagnostic, plan, micro_habits, pricing, cta

End of README.