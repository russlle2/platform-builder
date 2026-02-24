This chunk provides the contact page and brief documentation for the holistic medicine theme.

Files included:
- contact.html — the contact / reach page for the site. It includes:
  - Accessible navigation with varied labels (Sanctuary, Offerings, Concerns, Path, Investments, Practitioners, Book, Reach).
  - A hero contact area with phone/email placeholders and a contact form.
  - Gentle copy reflecting an educational, whole-person approach (no cure guarantees).
  - Micro-habits sidebar and a short explanation of the practice approach.
  - Inline decorative SVG pattern and gradient orbs for visual richness (no external assets required).
  - Client-side mailto fallback that builds an email from form inputs; form does not persist data.

Placeholders that must be replaced or provided by the consuming system:
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

Notes for integrators:
- The page is self-contained (no external fonts or images). Visual texture is produced with inline SVG and CSS gradients.
- The contact form uses mailto as a fallback to avoid server-side dependencies; replace or wire to a backend endpoint if needed.
- Ensure values for placeholders are sanitized and provided before publishing to avoid literal placeholders being visible to visitors.

Design voice: mystic_modern — calm, slightly poetic, and rooted in education and partnership rather than medical guarantees.

This chunk intentionally avoids creating other site pages or assets; other chunks supply index, services, patterns, and global assets.