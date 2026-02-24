Chunk 4 — contact page and README for the aromatherapy front-end bundle

Files included:
- contact.html  — The interactive contact page with:
  - Mood-to-Method selector: pick a present state and the page morphs a recommended, safety-minded method and updates the CTA label and link fragment.
  - Aroma wheel: an SVG wheel with interactive top/middle/base note segments. Hover to reveal descriptors; click a segment to apply a quick method suggestion.
  - Contact form (demo): prevents default submission and shows a sent state (replace with your backend endpoint).
  - Safety FAQ: dilution, patch testing, pregnancy & pets notes as required.
  - Navigation that links to the other site pages: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html.
  - Uses the placeholder tokens: {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}.

Notes for integrators:
- The page references an SVG pattern at assets/img/pattern.svg for the header background. Add a unique pattern.svg in that path (chunk constraint in other parts of the project).
- All text is intentionally safety-forward ("may support"). No medical or therapeutic claims are made.
- The mood choices produce different CTA labels and an anchor fragment is appended to PRIMARY_CTA_URL for context (e.g. "#focus").
- The contact form is client-only for the demo; replace the submit handler with an actual POST to your server or a service endpoint.

Accessibility & behavior:
- Mood options are keyboard-focusable buttons. The method panel updates with aria-live="polite" so screen readers receive changes.
- The aroma wheel is an SVG; hover reveals info and click sets a contextual method.

Customization:
- Replace placeholder tokens with real values at build time or via your templating engine.
- Adjust dilution guidance in the FAQ to match your preferred language and local regulations.

How to preview locally:
1. Place this file and contact.html in a simple static server root (or open contact.html directly in a browser).
2. Ensure assets/img/pattern.svg exists if you'd like the header pattern to show.

Design notes:
- Navigation labels differ from common templates (Essence, Sessions, Custom Blends, Boutique, Investment, About, Reserve, Connect).
- The membership/offer model appears in the site copy and CTA flows but pricing and membership pages are separate files in other chunks.

If you need this contact page adapted to use a specific back-end, or to add analytic events to the mood selections, tell me which endpoint or analytics system to target and I'll update the JS.