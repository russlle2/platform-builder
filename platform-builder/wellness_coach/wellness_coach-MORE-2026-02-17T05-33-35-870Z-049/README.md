Chunk README for wellness_coach-MORE-2026-02-17T05-33-35-870Z-049

Files included in this chunk:
- contact.html  — Contact page with interactive Proof Gallery and two instances of a Pricing Comparator toggle (monthly vs cohort package). Includes a contact form that drafts an email, rotating testimonials, and credibility badges with tooltips.

Placeholders to replace in your build:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes and integration:
- The contact page references assets/img/pattern.svg for a repeating background pattern. Ensure that file exists in your assets/img folder (this chunk does not include the SVG itself).
- Proof Gallery: testimonials rotate automatically. Badge tooltips are revealed on hover/focus.
- Pricing Comparator: two toggles on the page update price displays with a small animation. Pricing values are inside the inline script; adjust them as needed.
- No external fonts or CDNs are used. All styles are inline for portability.
- Use the rest of the site pages (index.html, about.html, programs.html, pricing.html, testimonials.html, book.html) to complete the site; links in the header assume those filenames.

Accessibility:
- Badges are keyboard-focusable (tabindex) and tooltips appear on hover/focus.
- Form fields include basic required attributes. The submit action opens the user's mail client as a simple, local-friendly send.

Developer tips:
- Replace placeholders server-side or with your templating pipeline.
- If you add a separate assets/img/pattern.svg, keep the pattern subtle to avoid visual noise behind card surfaces.

This chunk follows the clinic_modern layout family and is written in a playful, premium voice suited to a cohort-based wellness coach offering.