Contact page and notes for chunk 4

Files included:
- contact.html : A standalone contact & proof page for the sound-bath site.

What this page contains:
- Nav linking to the site pages: index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html, contact.html.
- Sound preference mixer (Gentle / Medium / Intense) implemented in local JS that updates program recommendations in real time and writes the selection to a hidden form field.
- Contact form (local demo). Submits are handled client-side and show a confirmation alert; does not post to any server.
- Proof Gallery: rotates testimonials every ~4.5s and dynamically rebuilds credibility badges with hover tooltips.
- Contraindications block: responsible medical note included in the contact flow.
- Small SVG pattern used as a page background embedded as a data URI (no external assets required).

Placeholders you should replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design notes / local dev:
- No external fonts or CDNs used. Keep files together and open contact.html in a browser to test.
- The proof rotation and mixer are intentionally light-weight and accessible: keyboard-focusable badges, aria-live for rotating content, and form controls are standard HTML elements.

Accessibility & safety:
- The page includes a contraindications notice for common exclusions (photosensitive epilepsy, recent head trauma, inner-ear issues, pregnancy, cardiac devices) — adapt language per practitioner guidance.

If you need the SVG asset as a separate file (assets/img/pattern.svg) instead of the embedded data URI, extract the pattern from the contact.html background-image and place it at that path; update CSS to reference it.
