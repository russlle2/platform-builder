Contact page and widgets for aromatherapy site — chunk 4.

Files included:
- contact.html : Full contact page with two interactive tools and a quick contact form.

How to run locally:
1. Place this file and the rest of the site files (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) into a local directory.
2. Ensure an SVG pattern exists at assets/img/pattern.svg (the page references this for background texture). No external fonts or CDN required.
3. Open contact.html in a browser.

Features implemented (local-only, no server required):
- Session Planner
  - Inputs: focus, sessions/week, minutes per session, delivery methods, notes.
  - "Compose plan" builds a plaintext plan that summarizes program outline and suggested package language.
  - "Copy plan text" copies the plan summary to clipboard for pasting into email or notes.
  - Reset clears fields.

- Blend Builder
  - Choose a vibe and an audience profile (adult, sensitive, child, pregnancy, pets) and a bottle volume (ml).
  - Produces a suggested formula (simple percentages) and computes a conservative dilution guide.
  - Uses an assumed 20 drops/ml rule to compute approximate drops for given dilution percentages (e.g., 2% adult, 1% sensitive, 0.5% child).
  - Copy blend card to clipboard and Export as .txt (client-side generation).
  - All language is safety-forward and non-medical; patch test, pregnancy, and pet notes included.

Notes on placeholders:
- Page includes placeholders that must be replaced or left for templating: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Accessibility & safety:
- The builders are local JS only and perform no network calls. Copy, download, and alerts are handled client-side.
- Dilution guidance is conservative and for informational purposes only — see FAQ section on contact page.

Customization tips:
- Adjust blends and percentages in the blends object inside contact.html to match practitioner preferences.
- The drops/ml constant can be tuned (20 is used as a common estimate). If you wish to prefer 25 drops/ml, change dropsPerMl in the script.
- Update the call-to-action and booking URL by replacing {{PRIMARY_CTA_URL}} and {{PRIMARY_CTA_LABEL}}.

Legal and safety reminders:
- This bundle intentionally avoids medical claims and uses 'may support' and conservative phrasing.
- For pregnancy, pets, or serious health concerns, recommend consulting a qualified professional.

If you need an assets/img/pattern.svg sample, request the SVG and it will be provided as a separate file.