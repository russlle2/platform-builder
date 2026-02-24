# contact.html — {{BUSINESS_NAME}} (Contact page)

This chunk contains two files:

- contact.html — a fully self-contained contact page with a playful-premium tone tailored for a private practice therapist.
- README.md — this file.

Key features
- Mood-to-Method selector: pick a current state and the page updates a recommended approach and the primary CTA text/href. All logic is local JavaScript.
- Session guidelines and a separate Confidentiality & Limits accordion. Both include a respectful crisis notice for safety and clarity.
- No external assets or CDNs are used. Styling and a simple SVG pattern are embedded in the page for visual texture.
- Accessible structure: semantic headings, details/summary for accordions, aria-live for the recommendation area.

Placeholders to fill in your build or CMS:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not present on this page but available site-wide)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

How to test locally
1. Place contact.html into your static site folder alongside the other pages (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html).
2. Open contact.html in a browser.
3. Use the Mood-to-Method buttons — the recommendation box and the primary CTA will update.
4. Try the contact form: it simulates a send with a brief delay and shows an alert (no network activity).

Notes for the clinician/owner
- The copy is intentionally grounded and avoids medical claims or promises. It includes confidentiality boundaries and guidance about emergencies.
- You should replace placeholders with your actual contact details and booking URL before publishing.

If you need adjustments to the tone, layout, or to add a real submission endpoint, I can update the form handling and markup.