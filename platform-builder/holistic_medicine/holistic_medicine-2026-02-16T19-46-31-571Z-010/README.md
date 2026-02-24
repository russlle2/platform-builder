Project: holistic_medicine (chunk 4)

This bundle contains files for the contact page and project README for the holistic/integrative medicine site.

Files included in this chunk:
- contact.html  — contact / connect page for the site, designed with zen_minimal layout and minimal_poetic voice.
- README.md     — this file (you are reading it).

Placeholders to replace (case-sensitive):
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

Notes & usage
- Open contact.html in a browser to preview. No external assets or fonts are required; visuals use inline SVG + CSS gradients.
- The contact form posts to the URL in {{PRIMARY_CTA_URL}}. Replace with your form handler or integration endpoint (or a serverless function). If you do not have an endpoint, use a mailto: link or implement a server-side receiver.
- Accessibility: form fields include labels and a clear consent checkbox. The page contains a brief, compliant notice that it does not promise cures and emphasizes education and whole-person care.
- Event series: the aside references workshops and event series. Use the form 'reason' field for event RSVPs when appropriate.

Design notes
- Layout: two-column responsive layout that collapses on narrow screens.
- Visuals: unique inline SVG pattern provides the background motif (no external image files). If you maintain a project-wide assets folder, you may move the SVG into assets/img/pattern.svg and update the markup accordingly.
- Voice: minimal_poetic — calm, educational, and non-prescriptive language. Avoid medical guarantees in all content.

Integration tips
- Replace placeholders before deploying.
- Ensure form endpoints and email/phone contact values are valid.
- If collecting personal data, confirm privacy policy and data storage practices meet applicable regulations.

Other pages in the full site (not included in this chunk): index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html. Each page is expected to use varied navigation labels and unique section orders to maintain content diversity.

If you need the companion pattern as a standalone SVG file or the remaining pages, request the next chunk and specify which files to generate.