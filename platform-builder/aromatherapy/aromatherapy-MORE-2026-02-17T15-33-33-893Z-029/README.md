Contact page and instructions for the aromatherapy membership site.

Files in this chunk:
- contact.html — "Connect" page with a form, proof gallery, credibility badges with tooltips, and a small pricing comparator toggle.

How to run locally:
1. Place this file alongside the rest of the site files: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html and the assets folder.
2. Ensure assets/img/pattern.svg exists (used by other pages) and any global css/fonts are present if provided in other chunks.
3. Open contact.html in a modern browser (no server required for static features). For mail links, the page uses mailto when copying the email address.

Daring features implemented here:
- Proof Gallery: a small carousel that rotates testimonials automatically; users can pause by hovering and navigate with previous/next. Credibility badges show contextual tooltips when focused or hovered.
- Pricing Comparator: a Monthly vs Package toggle with a numeric animation when switching. The comparator is intentionally small to serve as a quick preview for prospects contacting the practice.

Placeholders to replace (must remain as given):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Important content notes:
- Language is safety-forward. No medical claims. Uses "may support" phrasing where relevant.
- FAQ includes dilution, patch test, pets, and pregnancy guidance reminders.
- All interactive features are implemented with local JS; no external services or CDNs are required.

Accessibility & behavior:
- Carousel has controls and pauses on hover.
- Badges are keyboard-focusable and reveal tooltips on hover/focus.
- Pricing comparator updates an aria-live price container for assistive tech.

If you need changes to copy, styling, or to move the comparator / proof gallery to another page, instruct which page and preferred position.