# Holistic Medicine site — contact page

This bundle includes the contact page and developer notes for the holistic/integrative medicine site created with the "bold_playful" layout family and a "mystic_modern" voice.

Files in this chunk:
- contact.html — the full contact page with inline SVG pattern, CSS, and lightweight client-side form behavior.

Placeholders (replace before publishing):
- {{BUSINESS_NAME}} — Your practice name.
- {{TAGLINE}} — Short descriptive tagline.
- {{PHONE}} — Primary contact phone number.
- {{EMAIL}} — Primary contact email address.
- {{PRIMARY_CTA_LABEL}} — Label for the main CTA button (e.g., "Send Request", "Request Visit").
- {{PRIMARY_CTA_URL}} — Primary CTA URL (used on other pages; contact uses mailto fallback).
- {{CITY}} — City for the practice.
- {{STATE}} — State for the practice.
- {{PRACTITIONER_NAME}} — Clinician's full name.
- {{CREDENTIALS}} — Degrees / credentials (e.g., ND, LAc, MD).

Notes on design and behavior:
- Visuals are created with CSS gradients and an inline SVG pattern in contact.html. No external images, fonts, or CDNs are required.
- The SVG is embedded directly in contact.html to satisfy the requirement for a unique pattern without external assets.
- The contact form uses a mailto fallback: on submit it builds a mailto: link to {{EMAIL}}. This is a simple strategy for a static site. For production, replace the form handler with a secure server endpoint or third-party form service.
- The page intentionally uses educational language and a non-claiming tone. It includes an emergency-care disclaimer.
- Add-on retail items and optional labs are presented as optional purchases; they are informational. No medical guarantees are made.

Accessibility and responsiveness:
- The layout is responsive and stacks columns on narrow screens.
- Color contrasts use bright accent colors on a deep background; verify against accessibility criteria in your final content.

Developer tips:
- To change navigation labels, edit the <nav> links in contact.html. Ensure the hrefs map to the other pages in the site: index.html, services.html, approach.html, about.html, pricing.html, book.html, contact.html.
- To wire up a backend, replace the mailto flow in the <script> with a fetch POST to your server. Keep consent checkbox and simple validation.
- If you prefer to host the SVG as a separate asset, extract the <svg> element into assets/img/pattern.svg and update the markup/CSS accordingly.

License: this page is provided as starter UI for a holistic/integrative medicine practice. Review legal and privacy requirements before collecting patient information.
