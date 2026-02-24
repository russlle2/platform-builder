Chunk: contact page for the holistic_medicine site (layoutFamily: bold_playful, voiceFamily: clinical_calm).

Files included in this bundle:
- contact.html — a self-contained contact and appointment page. The page references assets/img/pattern.svg for a tiled SVG background pattern (please add a unique pattern.svg there).

Placeholders to replace before publishing:
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

Editing notes:
- Replace placeholders with your templating or deployment tool.
- The contact form uses a simple client-side routine: on submit it redirects to PRIMARY_CTA_URL with query parameters if that placeholder is present; otherwise it opens a mailto to EMAIL. Update the inline <script> in contact.html to hook into your API endpoint or server-side form handler.
- CSS lives in the top <style> block. Adjust color variables (--accent, --bg1, --bg2, --muted) to fit brand colors.

Accessibility & content guidance:
- Form fields have labels and required attributes. The color palette aims for readable contrast but should be tested with your exact brand values.
- Content follows holistic/integrative medicine guidelines: emphasis on education, whole-person planning, optional labs; explicit avoidance of guaranteed cures or definitive promises.
- If you create a separate conditions page, include common concerns such as stress, sleep, digestion, inflammation and energy, and add a clear disclaimer about individualized care and no guaranteed cures.

Assets:
- Add a unique SVG at assets/img/pattern.svg. The page uses that file for tiled background texture; do not rely on external fonts or CDNs.

Deployment:
- Place contact.html alongside the other site pages (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html).
- Verify links in the navigation and ensure PRIMARY_CTA_URL points to your booking flow or booking provider.

Support:
- For visual edits, change the CSS variables and styles in the <style> block.
- For behavior, update the inline JavaScript in contact.html to send form submissions to your server or a third-party form processing service.

License: MIT (placeholder).