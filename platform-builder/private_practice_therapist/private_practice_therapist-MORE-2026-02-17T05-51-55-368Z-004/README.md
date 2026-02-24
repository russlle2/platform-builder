Contact page for private_practice_therapist site (chunk 4)

Files included:
- contact.html : The contact & interactive diagnostic page.

Purpose:
- Contact page is designed for a clinician-run private practice site. It includes a brief diagnostic "Mood-to-Method" selector and a simple "Pricing Comparator" toggle to show monthly vs package framing with animated numbers.
- The page uses placeholders for site-specific values that should be replaced during deployment or templating:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}

Local interactive features (no external services):
- Mood-to-Method selector: choose a mood tile to update the recommended approach (title, copy) and the CTA text. The CTA preserves the placeholder label and appends a short action hint (e.g., "{{PRIMARY_CTA_LABEL}} — Stabilize").
- Pricing Comparator: a toggle switch between Monthly and Package. The displayed dollar amounts animate smoothly between values configured in data attributes on the price elements.

Important notes for deployment:
- This chunk references an SVG pattern at assets/img/pattern.svg for decorative background. Ensure that file exists and contains a suitable SVG pattern.
- No external fonts, CDNs, or images are required beyond the local pattern asset.

Content & legal guidance:
- The contact page includes confidentiality, scope boundaries, and a crisis notice. It avoids medical claims or guarantees and reads like a clinician-authored note.
- Replace placeholders with real practice details and phone/email before publishing.

How to test locally:
1. Place contact.html in the same folder as your site pages (index.html, about.html, etc.).
2. Create assets/img/pattern.svg (a simple repeating SVG pattern). The page references it as a background image.
3. Open contact.html in a browser. Interact with the mood tiles and the pricing switch. Submit the form to see the local confirmation behavior.

Accessibility & behavior:
- The mood tiles and the pricing switch are keyboard-accessible.
- The pricing animation uses requestAnimationFrame for smooth updates.

If you need an SVG pattern sample or additional pages for this template, request the next chunk containing assets or other HTML files.