This folder contains the contact page and notes for the private practice therapist site (chunk 4).

Files included:
- contact.html — The contact page with embedded CSS + JS. It includes:
  - A secure-feeling contact form (local behavior only).
  - A Proof Gallery that rotates testimonials and displays credibility badges with accessible tooltips.
  - A Pricing Comparator toggle (Monthly vs Package) with animated number transitions.
  - Confidentiality and crisis notes consistent with clinical boundaries.
  - Placeholder tokens to replace with your practice details: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Notes for use:
- No external assets are loaded. The page references an SVG pattern at assets/img/pattern.svg; include a unique pattern file at that path.
- All interactive behaviors run locally in the browser (no server required). The contact form is a mock — replace form submission with your server endpoint if needed.
- Accessibility: badges are keyboard-focusable and show tooltips on focus/hover; testimonial area uses aria-live to announce changes.

Editing tips:
- Replace placeholder tokens with your real values (or use a build step to inject them).
- Update pricing values inside the HTML data attributes (data-month and data-package) on the .price elements.
- To change rotation timing for testimonials, edit the interval value in the Proof Gallery script (currently 5000 ms).

Compliance and tone:
- Language intentionally avoids guaranteed outcomes and medical claims.
- Includes confidentiality language and a crisis notice. Adjust to match local regulations and licensing guidance.

If you need the matching SVG asset (assets/img/pattern.svg) or other pages from this site, request the next chunk.