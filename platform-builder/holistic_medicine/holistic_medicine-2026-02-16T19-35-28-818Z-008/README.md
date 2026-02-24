This chunk contains the contact page and guidance for the Holistic / Integrative Medicine site.

Files included:
- contact.html — a complete, responsive contact + intake page built for an "intensive" consult model.

Design notes:
- Visual system: earthy_warm palette (terracotta, ochre, sage, cream) with soft gradients, rounded cards, and an SVG pattern background referenced at assets/img/pattern.svg. The pattern file is expected elsewhere in the bundle.
- Voice: playful_premium — friendly, confident, and slightly elevated language suitable for a practitioner who focuses on whole-person care.
- The contact page emphasizes education and support rather than cures. It includes micro-habit suggestions, a short explanation of the intake/plan/follow-up flow, and a simple contact form.

Placeholders to replace:
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

Integration tips:
- Ensure assets/img/pattern.svg exists in the final build — the page uses that file for the background motif.
- The form action uses {{PRIMARY_CTA_URL}}. Wire this to your server endpoint or a booking handler. If you prefer a mailto fallback, substitute: mailto:{{EMAIL}}.
- This page uses only inline CSS and an embedded SVG map (no external fonts or CDNs).

Accessibility & privacy:
- Form fields include labels and required attributes where appropriate.
- The page includes a brief privacy note and a statement that the practice focuses on education and planning — not guaranteed cures.

Notes for other pages in the site:
- Keep navigation labels subtly varied across templates (e.g., Offerings, Concerns, Method, Investment) to maintain a distinct feel on each page.
- conditions.html should list common concerns (stress, sleep, digestion, inflammation, energy) and include clear disclaimers about the intention of symptom support and education.
- approach.html should describe intake, plan, follow-ups, and optional labs as educational tools.

License: free to adapt for the {{BUSINESS_NAME}} project. Replace placeholders and integrate with your booking and data-handling systems.