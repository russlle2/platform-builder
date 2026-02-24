Contact page and usage notes for the sound bath template chunk.

Files included in this chunk:
- contact.html : The contact & interactive utility page.

Purpose:
- This page provides a friendly contact experience while showcasing two small client-side utilities:
  1) Pricing Comparator: toggles between monthly and package pricing with animated number transitions.
  2) Mood-to-Method selector: choose a current state and the recommended approach, description, and CTA update dynamically.

Placeholders to replace in a production build (left as tokens):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used on this page but available across the site)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes on behavior:
- The contact form is a mock/example: it does client-side validation and then displays a faux success message. Integrate with your server or form-backend as needed.
- The mood selector writes the chosen mood into a hidden input named "mood" ready for server consumption.
- The pricing comparator reads prices from data attributes (data-month and data-pack) and animates numbers on toggle.

Accessibility & safety:
- Buttons and controls include basic aria attributes. The page contains a contraindications disclaimer; adapt the language to match your legal/research requirements.

Testing:
- Open contact.html in a modern browser. Click the mood buttons to see the method card change and CTA update.
- Toggle pricing between "Monthly" and "Pack" to watch animated prices.
- Submit the form to view the mocked success banner.

Integration:
- Hook form.submit to your endpoint or replace the success block to perform a fetch/AJAX call.
- Replace placeholder tokens with your real values during build-time.

Design:
- No external fonts or assets are required for this page; the visual pattern is embedded inline as an SVG.

Contact for developers:
- This chunk was built to be self-contained. If you need additional modularization (separate JS/CSS), extract the <script> and <style> blocks into files and reference them from the pages that require these utilities.
