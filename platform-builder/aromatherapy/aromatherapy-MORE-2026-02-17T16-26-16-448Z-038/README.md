Contact page and instructions for the aromatherapy site.

Files in this bundle:
- contact.html — complete contact page with a safety-first contact form, rotating testimonial proof gallery, credibility badges with tooltips, a micro pricing comparator toggle (monthly vs package) with animated numbers, and a short FAQ covering dilution, patch testing, pets, and pregnancy notes.

Notes and setup:
- This bundle intentionally references an SVG pattern at assets/img/pattern.svg for the page background. Create that file in your project before using the page (or replace the URL in the stylesheet with an alternate background).
- No external fonts or CDNs are used; the page relies on system fonts.
- To preview, place contact.html in the root of your site alongside the other pages (index.html, services.html, etc.) and open it in a browser.

Interactive features (local JS only):
- Proof Gallery: Rotates testimonials every 5 seconds. Credibility badges show contextual tooltips on hover and toggle on click for touch devices.
- Pricing Comparator: Toggle between monthly and package presentation. Prices animate smoothly to the new values.

Accessibility & safety:
- Tooltips are keyboard-accessible (focus/Enter/Space) and badges are reachable with tabindex.
- The form does not submit to a server in this demo; the sendContact() function simulates a send. Replace with your endpoint as needed.
- Copy and guidance follow a safety-first approach: language avoids medical claims and uses "may support" phrasing. The FAQ includes dilution, patch testing, pets, and pregnancy guidance.

Placeholders to populate:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Developer tips:
- If you add an assets/img/pattern.svg file, consider using a subtle, low-contrast repeating pattern to keep the page feeling calm and clinical-calm in tone.
- To connect the contact form to your backend, replace the sendContact() stub with a fetch() POST and handle validation server-side.

License: This bundle is provided as-is for integration into the site skeleton. Ensure any clinical claims are vetted and that client safety guidance complies with local regulations.