Chunk 4 — contact.html

This bundle contains the contact page and a short README for the aromatherapy site.

Files included:
- contact.html — the Connect / Contact page for the site. Contains the required section pack: hero, ritual, what_to_expect, schedule, pricing, faq, cta. Also includes an inline decorative SVG pattern to ensure visual richness even if external assets are not present.

Placeholders you should replace in templates (keep curly braces):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}}

Notes for integration:
- Navigation links point to the site pages: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html.
- The page avoids medical claims and frames aromatherapy as supportive, safety-first practice. FAQ covers dilution, patch testing, pets, and pregnancy notes.
- Visuals rely on CSS gradients and an inline SVG pattern. There is also an expectation that an external assets/img/pattern.svg may exist in other chunks — the inline SVG provides a fallback and a unique pattern for this page.
- The form is a static POST to /thank-you.html; if you implement a server or form handler, update the action attribute accordingly.

Accessibility & responsive:
- Landmark elements (header, main, footer) and section headings are included for screen readers.
- Layout collapses to a single column on narrow viewports.

Developer tips:
- To customize brand colors, edit the :root variables at the top of the <style> block.
- To add analytics or server-side handling, safely insert scripts before </body>.

If you need the complementary assets (SVG file, fonts, or additional pages) for the full site, request the next chunk to receive them.