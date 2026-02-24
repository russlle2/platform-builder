Contact page + notes for wellness_coach site

Files in this chunk:
- contact.html — The contact page of the site with a built-in Proof Gallery and a Pricing Comparator micro-interaction.

How to view locally:
1. Place this file alongside the rest of the site files (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html) and the assets folder containing assets/img/pattern.svg.
2. Open contact.html in a modern browser (no server required for basic interactions).

Features implemented on contact.html:
- Contact form (local demo): collects name, email, phone, interest and message. Submission is handled locally and shows a temporary confirmation. Replace with real endpoint as needed.
- Proof Gallery: Rotating testimonials with next/previous controls, auto-rotate, pause-on-hover. Each testimonial shows a set of credibility badges. Badges present a tooltip on hover and are keyboard-focusable.
- Pricing Comparator: Toggle (keyboard accessible) that switches between monthly and package pricing. Numeric transitions animate smoothly for clarity.

Placeholders to replace in your environment (keep exact token strings):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes & constraints followed:
- No external fonts, assets or CDNs are referenced. The page references assets/img/pattern.svg for the background pattern (include a unique SVG at that path).
- Copy avoids medical claims and focuses on outcomes, habits, and frameworks.
- Visual elements use inline SVG icons and CSS only.

Accessibility & small details:
- The proof gallery uses aria-live for testimonial updates.
- The toggle implements role="switch" and supports keyboard activation.

If you need the pattern.svg or additional pages for this project, request the next chunk and I will generate them (unique pattern SVG will be provided as required).