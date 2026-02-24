Contact page and integration notes for the aromatherapy site (zen_minimal / minimal_poetic)

This bundle contains the contact page (contact.html) and usage notes.

Files included:
- contact.html — the full contact page with a contact form, FAQ, studio details, and an interactive "Try it now" guided exercise modal. The page uses local JS and CSS only; no external assets.

Placeholders to replace (keep the curly braces):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Integration notes:
- The page references a repeating SVG pattern at assets/img/pattern.svg for the soft backdrop. Add a unique SVG at that path to enable the textured header area.
- Navigation links assume the following files exist at site root: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html.

Accessibility & behaviour highlights:
- Scroll-triggered reveal: implemented with IntersectionObserver. It respects prefers-reduced-motion: when reduced-motion is enabled, all reveal animations are skipped and sections are shown immediately.
- Guided exercise modal: a small multi-step experience (breathing, journaling, intention) built in vanilla JS.
  - Respects reduced-motion preferences: animations are simplified.
  - Uses localStorage to save a chosen intention (if available).
  - No external analytics or networks used.
- The contact form attempts to open the user's mail client (mailto) as a fallback — this is a static template and does not include a server backend.

Safety & content notes (required by the niche):
- The FAQ includes dilution/patch test notes and guidance for pets and pregnancy, using safety-forward language ("may support"), non-medical.

How to test locally:
1. Place contact.html in the same folder as the other page files.
2. Provide an SVG at assets/img/pattern.svg or remove the background-image rule in the CSS if you prefer not to use it.
3. Open contact.html in a browser. Click "Try it now" to exercise the modal. Toggle system "Reduce motion" to confirm the reduced-motion behaviour.

Customization suggestions:
- Update the CTA buttons and primary link using {{PRIMARY_CTA_URL}} and {{PRIMARY_CTA_LABEL}}.
- Replace placeholder phone/email and location with real values.
- Replace the SVG logo and pattern with your brand assets. The current shapes are intentionally simple and self-contained.

Notes for maintainers:
- No external fonts or CDNs are used; all visuals are rendered via CSS and inline SVG.
- The script is minimal and intentionally avoids frameworks for portability.

If you need additional pages or the SVG pattern created, request the next chunk and specify pattern preferences (color palette, density).