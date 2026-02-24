Project: aromatherapy-2026-02-16T18-46-18-682Z-047

Layout family: zen_minimal
Voice family: minimal_poetic
Offer model: events_series

Chunk: 4 — contact + README

Overview:
This chunk provides the contact page (contact.html) and a README describing the project and usage.

Files included:
- contact.html : A focused, safety-forward contact and outreach page for an aromatherapy practitioner. Uses a gentle gradient, an inline SVG pattern for visual texture, a two-column layout (hero + contact card), and a small client-side script to simulate submission and show a confirmation overlay.
- README.md : You are reading it.

Placeholders (replace these with your business data):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}}

Notes and constraints honored:
- Visual richness is achieved with CSS gradients, rounded cards, and an inline SVG background. No external images or fonts are referenced.
- The content is safety-forward and explicitly not medical; the contact form requests safety-relevant details (pregnancy, pets) and requires consent acknowledging aromatherapy is supportive, not medical care.
- Navigation labels intentionally vary from other pages ("Gather", "Offerings", "Reach") to meet uniqueness requirements.
- This chunk does not include assets/img/pattern.svg. Ensure a unique pattern file is created at assets/img/pattern.svg in another chunk to centralize decorative assets as required.

How to test locally:
1. Place this project directory in a local web server root or open contact.html directly in a modern browser.
2. Fill and submit the form to see the confirmation overlay. No network calls are made; this is a local UI demonstration only.

Accessibility & behavior:
- Form uses semantic labels and required attributes for basic accessibility.
- Overlay is dismissible via the "Close" button or Escape key.

Next steps for integration:
- Wire the form to a server endpoint or Form handler (replace simulated client behavior).
- Replace placeholders with real contact details and CTA links.
- Add the rest of the site pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) and the required SVG file at assets/img/pattern.svg if not already present.

Design tips:
- Keep imagery minimal and rely on typography, soft color palette, and patterns for a calming aesthetic.
- Keep copy concise, safety-minded, and evocative — invite curiosity without promising clinical results.

License: CC0 — adapt freely for a small business website.
