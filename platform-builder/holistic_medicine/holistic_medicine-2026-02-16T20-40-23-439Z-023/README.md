Contact page and guidance for the holistic_medicine site (chunk 4)

Files included in this bundle:
- contact.html  — complete contact page with embedded SVG background, contact form, lead-magnet form, FAQs, testimonials, and final CTA.
- README.md     — this file.

Purpose
- This chunk provides the contact page for the Holistic / Integrative Medicine website. It follows the project voice (minimal_poetic) and warm, earthy visual language.

Placeholders to replace
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

Notes and integration
- The contact form attempts to POST to {{PRIMARY_CTA_URL}}. For a working integration, ensure that URL accepts a multipart/form-data POST (or adapt the JS to match the endpoint API). If no endpoint is available, users can still contact via the mailto fallback which opens the default email client.
- The lead magnet form is a placeholder that currently shows a demo alert. Replace its handler with your mailing-list endpoint (Mailchimp, ConvertKit, etc.) as needed.
- An embedded decorative SVG is included inline for immediate visual richness. The CSS also includes a fallback reference to '/assets/img/pattern.svg' (if you prefer a standalone asset). To follow the design brief, consider creating a unique file at assets/img/pattern.svg and referencing it site-wide for consistent texture.

Accessibility & content guidance
- Headings and link labels were intentionally varied from other pages to satisfy uniqueness constraints while preserving clear navigation.
- The content avoids any language promising cures; it emphasizes education, whole-person assessment, and iterative care.
- Add alt text or aria labels on any additional images you include. The decorative svg is aria-hidden.

Styling and assets
- All visuals are implemented with CSS and an embedded SVG to avoid external CDNs. Colors and radii follow an 'earthy_warm' tone.
- If you add an external assets/img/pattern.svg, keep it stylistically consistent (warm gradient, organic shapes) and reference it in the global stylesheet as a background-image.

Deploy notes
- Ensure the server serving {{PRIMARY_CTA_URL}} includes appropriate CORS headers if you want the in-page fetch to succeed from browsers.
- Replace the placeholders before publishing.

This chunk contains only the contact page and README for chunk 4. Other site pages (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html) are provided in other chunks of the project.

Design/voice cue
- Keep copy minimal, gently poetic, and practical. Maintain the no-guarantee stance in all patient-facing copy.

If you want, I can:
- produce the assets/img/pattern.svg file to match the inline SVG style
- adapt the form to a specific backend endpoint (provide details)
- localize the page for another city/state

