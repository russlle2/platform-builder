Contact page and usage notes for the aromatherapy site bundle.

Files in this chunk:
- contact.html — The Connect page for web visitors. Contains:
  - Contact form that opens mail client with prefilled subject/body (mailto to {{EMAIL}}).
  - Mood-to-Method selector: choose a mood and the recommended approach, copy, and CTAs update dynamically.
  - Pricing Comparator: toggle between Monthly and Package pricing with animated number transitions.
  - Safety & FAQ notes (dilution, patch test, pregnancy, pets).

How to test locally:
1. Save contact.html and open it in a modern browser (Chrome/Firefox/Safari).
2. Click the Mood-to-Method buttons (Tense, Foggy, Restless, Steady) and watch the Recommendation block and CTA buttons update.
3. Use the pricing switch (click or press Enter/Space while focused) to toggle between monthly and package prices. Numbers animate.
4. Submit the contact form to open your mail client (mailto uses {{EMAIL}}).

Placeholders to replace in your deployment:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes and accessibility:
- The pricing switch is keyboard operable and uses aria-checked.
- The Mood-to-Method buttons are simple buttons; they change visible copy and CTAs only (no medical claims, safety-forward language included).
- No external fonts or assets are required; layout and visuals are implemented with CSS and inline SVG.

Safety guidance reminder (copy is present in the page): always recommend dilution (1–3% typical topicals for adults), patch test, consult a healthcare provider if pregnant or nursing, and check pet safety (cats especially sensitive).

If you need an assets folder (e.g., unique SVG pattern file assets/img/pattern.svg), add it to the bundle and update references. This chunk intentionally contains only the contact page and README as requested.