Contact page + usage notes for chunk 4

Files in this bundle:
- contact.html — The full contact page with blend builder and two guided micro-ritual modals (Breath + Intention, Journal Pause). This page is a self-contained static HTML file with inline CSS and JavaScript. It references an SVG pattern at assets/img/pattern.svg for decorative background; ensure you include a unique pattern.svg there when assembling the full site.

How the daring features are implemented:
- Blend builder: select a vibe and intensity, then click Create blend. The script composes a 10ml starter card and suggests dilution ranges. All copy is safety-forward and non-medical. Copy-to-clipboard copies the readable card text.
- Two guided exercises (pure JS):
  - Breath + Intention modal: three short breath cycles, timed phases, visual circle and simple timing. Runs locally via setInterval.
  - Journal Pause modal: three-step journaling micro-ritual (breathe, notice, set intention). Step through with Next/Finish.

Placeholders used (must remain in templates):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility & safety notes:
- The page avoids medical claims and uses phrases like "may support" and "informational". FAQ includes dilution, patch testing, pets, and pregnancy notes.
- Contact form is local-only and gives client-side feedback. Hook the form to your backend if you need real submissions.

Integration tips:
- Add a unique assets/img/pattern.svg file for the decorative background. The design expects that path.
- Ensure other site pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) exist at the same directory level so navigation links function.

Customization pointers:
- Adjust palette in the :root CSS variables for brand alignment.
- The blend builder uses example oil names and carrier approximations; replace or extend presets in the presets object in the script for your product roster.

Legal reminder:
- Content is for informational purposes only and not medical advice. Update legal copy and terms as needed for your location and practice.

Generated: aromatherapy-MORE-2026-02-17T16-03-17-498Z-034 (seed: 2035682721)
Layout style: earthy_warm — voice: playful_premium — offer model: cohort
