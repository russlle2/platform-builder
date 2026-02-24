# holistic_medicine-MORE-2026-02-17T18-39-27-421Z-011

Project: Holistic / Integrative Medicine — glass_morphism layout

Seed: 2766142416

Voice: playful_premium
Offer model: cohort

Chunk: 4 — files included in this bundle
- contact.html
- README.md

Purpose
- contact.html: Contact page with an intake form, embedded micro-interactions to demonstrate community proof (rotating testimonials + badges with tooltips) and a small pricing comparator (monthly vs package) with animated numbers. The page follows a glass-morphism aesthetic and uses only local assets and inline styles/scripts.
- README.md: this file.

Placeholders used (replace in your deployment):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes on interactive features
- Proof Gallery: Rotates through a short set of testimonials every ~4.2s. Hovering the gallery pauses rotation. Credibility badges include a small tooltip that appears on hover/focus to provide context about each credential.
- Pricing Comparator: A two-option toggle (Monthly / Package). Clicking either option animates the main price with a smooth numeric transition and updates a short value summary. Buttons are keyboard accessible and labeled with aria-pressed.

Design & accessibility
- Uses high-contrast glass panels with subtle gradients and clear focusable elements.
- Form fields are labeled, and the CTA is prominent. The gallery controls are keyboard operable.
- No medical claims or guaranteed outcomes are made; the page uses supportive language and suggests contacting local/urgent services in the footer.

Files and dependencies
- This chunk contains only two files listed above. The full site references other pages (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html).
- The layout expects an SVG asset at assets/img/pattern.svg for the page background. Ensure that file exists in the project assets for visual consistency.
- No external fonts, CDNs, or images are included in this chunk.

Developer notes
- Replace placeholders by your templating system or a simple search-and-replace before publishing.
- The contact form is a mock client-side handler that displays a confirmation message; integrate with your backend or form service as needed.
- The pricing comparator values are example figures; update the pricing object in the script for live data.

Compliance & tone
- The content uses educational, supportive phrasing and avoids claims of cures. On pages that describe conditions or care plans, include disclaimers and encourage users to consult licensed providers.

How to preview locally
1. Ensure the project root contains the referenced pages and assets/img/pattern.svg.
2. Open contact.html in a browser (file:// is adequate for static preview). For best results, serve via a local static server (e.g., `npx serve` or `python -m http.server`).

License
- This bundle is provided for project use. Adapt and modify as needed for your deployment.