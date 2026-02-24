Project chunk: contact page for private_practice_therapist.

Files included in this bundle:
- contact.html  — contact page with form, proof gallery, pricing comparator, and clinician notes.
- README.md     — this file.

Placeholders to replace:
- {{BUSINESS_NAME}} — practice name
- {{TAGLINE}} — (optional) tagline
- {{PHONE}} — phone number (tel link)
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — primary CTA button label (e.g., "Request a consult")
- {{PRIMARY_CTA_URL}} — primary booking URL
- {{CITY}} — city name
- {{STATE}} — state name

Features implemented:
- Glass-morphism visual style via CSS only (no external assets).
- Proof Gallery: cycles testimonials every ~4.5s; badges include tooltips on hover/focus.
- Pricing Comparator: toggle between "Monthly" and "Package" values; numeric changes animate smoothly.
- Contact form: client-side mailto composition (no backend). This keeps data local to user's device while enabling a quick reach-out flow.
- Accessibility basics: ARIA attributes on the pricing region and keyboard support for advancing testimonials (Space).

Clinical / compliance notes included on the page:
- Confidentiality, scope boundaries, and crisis guidance copy are present and should be reviewed for accuracy with local regulations.
- No guarantees or medical claims are made.

How to preview locally:
1. Place this file next to other site pages (index.html, about.html, etc.), and ensure the SVG pattern exists at assets/img/pattern.svg.
2. Open contact.html in a browser. The contact form uses a mailto: link and will open the user's mail client.

Design choices & considerations:
- Navigation labels differ from typical templates: "How I Work", "Focus Areas", "Plans", "Questions", "Book", "Connect" to emphasize process and access.
- Pricing language uses descriptive frames ("Short Clarity Series", "Sustained Support") rather than standard membership/session jargon to meet uniqueness requirement.
- The proof gallery balances social signal with clinician tone; testimonials are anonymized and phrased as client reflections.

Notes for integration:
- Replace placeholders with real content before publishing.
- Add the assets/img/pattern.svg file (unique SVG) to provide the textured background referenced in the stylesheet.
- If adding a backend, replace the mailto handler in handleSend() with a safe POST endpoint and server-side validation.

License: content provided as-is. Ensure all clinical statements meet your local regulatory and professional guidelines.