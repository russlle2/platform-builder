# Contact page — aromatherapy-MORE-2026-02-17T17-20-08-753Z-047

This bundle contains the contact page and a short README for the aromatherapy site.

Files:
- contact.html — Interactive contact and mini experience page with:
  - Mood-to-Method selector: choose a mood and the page adapts the recommended approach and CTA URL/text.
  - Aroma wheel: SVG wheel with three sectors (top / middle / base). Hover or focus a sector to highlight and reveal descriptions. Buttons over the wheel are keyboard-accessible.
  - Contact form and safety-forward FAQ items (dilution, patch test, pets, pregnancy notes).
  - Uses local CSS and JS only; no external assets or CDNs.

Placeholders (left unchanged for site templating):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design notes:
- Layout aims for a glass-morphism aesthetic using translucent panels and a subtle SVG pattern background referenced at assets/img/pattern.svg (ensure that file exists in the project root).
- Navigation uses alternative labels as requested (Portal, Offerings, etc.).
- Copy is safety-forward and avoids medical claims. Include dilution and patch-test guidance when customizing copy further.

How to use:
- Drop these files into your project folder alongside the other pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html).
- Ensure assets/img/pattern.svg is present and unique for this template.
- Replace the placeholder tokens with real values in your template engine or by doing a simple find-and-replace.

Accessibility & behavior:
- Mood pills are keyboard actionable (Enter / Space).
- Wheel has invisible button overlays so keyboard users can focus sectors; click shows a small alert as a lightweight interaction. You may replace alerts with custom tooltips.
- The contact form demonstrates client-side handling and can be wired to your backend.

Customization tips:
- To change moods or methods, edit the methods object in the inline <script> in contact.html.
- To change CTA routing behavior, alter the PRIMARY_CTA_URL placeholder or the logic that appends the mood query string.
- Keep safety language when editing ("may support", patch-test, mention pregnancy/pets if relevant).

License: free to adapt within your project. Attribution is optional.
