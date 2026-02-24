Contact page and project notes

Files in this bundle chunk:
- contact.html : Contact / proof gallery / pricing comparator micro-interactions / contact form
- README.md : this file

Placeholders to fill in the project before deployment:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented on contact.html:
- Accessible top navigation with unique label set and correct links to site pages.
- Hero section with a Proof Gallery that rotates testimonials automatically every 5 seconds and pauses on hover. Keyboard arrow left/right supported. Testimonials fade/slide in for a gentle effect.
- Credibility badges with small on-hover tooltips. Badges are keyboard-focusable and expose tooltip content.
- Two instances of a Pricing Comparator micro-component: toggles between a monthly view and a package/total view. Number changes are animated using requestAnimationFrame for smooth transitions.
- A lightweight contact form that demonstrates client-side handling (alert-based demo). Hook into backend endpoints or form handlers as needed.
- Visual style uses CSS only; the layout references a local SVG pattern at assets/img/pattern.svg for the hero overlay. Ensure that asset exists and is unique for the project.

Accessibility notes:
- Controls include appropriate roles and keyboard handlers (switch role, focusable badges, testimonial keyboard navigation).
- Tooltips are simple, appear on hover and focus, and use aria-visible patterns via CSS (non-hidden but visually toggled).

Integration notes:
- The contact form currently uses a demo submit handler. Replace submitForm() in the script with a real POST to your server or form handling service.
- Ensure assets/img/pattern.svg is present and unique to this project.
- Replace placeholders with organization-specific content and revise copy to reflect the practice's policies and language.

Design & tone:
- Mystic-modern voice: language is gentle and precise; copy avoids cure promises and keeps an educational/supportive tone.
- Avoid making diagnostic or treatment claims in any public-facing content; add appropriate disclaimers where necessary (especially on the Conditions page).

Deployment:
- This is static HTML/CSS/JS. Serve via any static host.
- No external fonts, CDNs, or assets are referenced other than the local SVG pattern.

If you want additional pages or assets built (pattern SVG, other pages, or backend form wiring), request the next chunk and indicate which files to include.