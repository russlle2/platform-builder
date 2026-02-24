Chunk 4 — contact.html

Files included:
- contact.html : A responsive contact page intended for the Sound Bath events site.

Purpose & integration
- This chunk contains only the contact page and an integration README. Place in the web root alongside the other pages (index.html, events.html, etc.).
- The page references an SVG pattern at assets/img/pattern.svg for site decoration; ensure that file is added in another chunk at that path.

Placeholders to replace (must be kept as-is until runtime):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Interactive features included (local JS, no external libs):
- Proof Gallery: Rotating testimonials with associated credibility badges. Badges expose small tooltips on hover. Rotation cycles every 6s; next/previous controls provided.
- Pricing Comparator: Micro toggle between "Monthly" and "Package". Clicking toggles the display and animates the price number smoothly using requestAnimationFrame.
- Simple contact form: Local validation and a mock send response. "Call us" button uses tel: link to {{PHONE}}.

Accessibility & safety
- ARIA roles on tab-like controls; form uses required attributes where applicable.
- A clear contraindications note is included (short, responsible). A link to the Safety/FAQ page is provided for more detail.

Design choices & notes
- Navigation labels are intentionally different to meet uniqueness: "Gatherings", "Calendar", "Sessions", "Investments", "Origin", "Safety", "Reserve".
- CTAs and copy avoid previously used signature phrases; copy leans toward a ‘‘mystic_modern’’ voice but remains practical.
- The contact page includes a short "Next public session" module so the events page can be referenced directly.

Integration checklist
- Provide assets/img/pattern.svg (unique SVG pattern) in the assets folder.
- Ensure global CSS fonts are available or acceptable fallbacks are used (the page uses system fonts only).
- Wire the primary CTA URL and label via {{PRIMARY_CTA_URL}} and {{PRIMARY_CTA_LABEL}}.

Testing
- Open contact.html and test the testimonial rotation, badge tooltips, pricing toggle animation, and contact form behavior.
- Replace placeholders to test tel: and mailto: links.

Notes for developers
- Everything is self-contained; if you centralize scripts/styles, consider moving the inline JS/CSS into shared files.
- Pricing numbers are illustrative — connect to real pricing logic or API where required.

End of chunk 4 README.