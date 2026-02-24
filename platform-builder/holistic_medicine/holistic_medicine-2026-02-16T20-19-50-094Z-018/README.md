Chunk 4 — contact.html

This bundle contains the contact page and a short README to integrate into the holistic_medicine site (split_diagonal layout, playful_premium voice).

Files included:
- contact.html — a self-contained contact page with inline SVG texture and split-diagonal visual treatment. The page is responsive, accessible, and uses only CSS + inline SVG (no external assets).

Placeholders you must replace at deploy-time:
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

Notes for integration:
- This chunk intentionally inlines its decorative SVG pattern and uses clip-path for the diagonal panel so no external images are required.
- Navigation labels were varied to fit the playful_premium tone: "What We Do", "Our Way", "Meet", "Reach Us". Ensure site-wide nav uses slightly different wording per template.
- The contact form uses a mailto POST fallback (mailto:{{EMAIL}}). For production use swap the form action to your chosen backend endpoint or attach JS for form handling / validation.
- Compliance: content avoids promises of cures and emphasizes education and a whole-person approach.
- Accessibility: semantic headings, labels tied to inputs, and clear ARIA-ready IDs are provided.

Integration tips:
- Drop contact.html into the root alongside the other templates (index.html, services.html, etc.).
- If you maintain a central assets folder, you can extract the inline SVG into assets/img/pattern.svg for reuse — update the page to reference it as background-image or <img> as desired.
- Keep {{PRIMARY_CTA_URL}} consistent across pages to point users to the booking flow (book.html or booking provider).

Design rationale summary:
- Split diagonal panel creates a premium, energetic composition that feels both approachable and curated.
- Inline pattern gives visual richness without external dependencies, matching the playful_premium voice used across the theme.
- The right column focuses on immediate action (form + contact info) while the left diagonal area provides context and social proof.

If you want a sister file that extracts the SVG to assets/img/pattern.svg or a server-ready contact handler (POST endpoint), ask and I will provide the additional files.