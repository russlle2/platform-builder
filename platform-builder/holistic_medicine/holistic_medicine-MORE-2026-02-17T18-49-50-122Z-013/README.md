Contact page and developer notes

This bundle provides the contact page and a small readme for the holistic_medicine site (chunk 4).

Files included:
- contact.html — Complete contact page with an embedded "Session Planner" interactive widget, scroll-triggered reveal animations that respect prefers-reduced-motion, copy/download of plaintext plan, and accessible controls.
- README.md — This file.

Placeholders present (replace as needed):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Implemented features of note:
- Session Planner: build a brief, shareable plaintext summary of priorities and first steps; supports copying to clipboard and downloading a .txt file.
- Scroll-triggered reveal: Uses IntersectionObserver; honors prefers-reduced-motion by revealing immediately.
- Local-only: No external libraries or CDNs used.

Design notes:
- Layout family: earthy_warm; voice: minimal_poetic.
- Navigation uses an alternative label set: Roots, Offerings, Common Concerns, Way We Work, Investment, Meet, Book, Connect.
- The contact page aims for an educational, supportive tone without medical guarantees. Any precise medical statements or diagnoses are intentionally absent.

Developer guidance:
- The site references an SVG pattern at assets/img/pattern.svg — ensure that file is created in the assets folder (unique pattern for this project).
- This chunk intentionally contains only contact.html and README.md per instructions. Other pages exist in the full site but are not part of this chunk.

Seed: 517311821
Slug: holistic_medicine-MORE-2026-02-17T18-49-50-122Z-013
Layout family: earthy_warm
Voice family: minimal_poetic
Offer model: hybrid

Accessibility:
- Interactive chips are keyboard-accessible.
- Summary exposed with aria-live for screen readers.

To preview locally: open contact.html in any modern browser. For full-site flow, ensure other pages and the SVG pattern exist in their paths.