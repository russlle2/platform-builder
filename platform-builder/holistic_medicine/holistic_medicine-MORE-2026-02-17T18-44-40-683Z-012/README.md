Contact page and instructions for chunk 4

Files included in this bundle:
- contact.html : the full contact page with a contact form, contact details, quick FAQ, and a guided practice modal (breathing / journaling / intention).

Purpose and how to use:
- Place contact.html at the root of your site alongside the other pages (index.html, about.html, etc.).
- The page expects a site-level SVG used as a repeating background at assets/img/pattern.svg. The path is referenced from CSS: url('assets/img/pattern.svg'). Create a unique pattern SVG at that path to match the project style.

Placeholders to replace (left literal in the HTML):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (optional elsewhere)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility and progressive enhancement notes:
- Scroll reveals use IntersectionObserver to add the .visible class. If the user prefers reduced motion (prefers-reduced-motion: reduce), elements are shown immediately with no transitions.
- The guided exercise modal respects prefers-reduced-motion and will not run motion animations when the preference is set.
- The modal is dismissible via the Close button, the overlay background, and the Escape key.
- Form submits are intercepted client-side for a demo flow; production should POST to your server endpoint or integrate with an email/CRM service.

Guided exercise behavior:
- Three practice types: breathing (2 minutes), journaling (5 minutes), and short intention setting (1 minute).
- Breathing uses a simple inhale/hold/exhale loop; if prefers-reduced-motion is true, it will fall back to non-animated guidance.
- Timer is client-side only and ends the session with a brief acknowledgement. No data is recorded by the exercise.

Developer notes:
- No external fonts, CDNs, or images are included in this chunk. Keep assets local.
- The contact form is intentionally lightweight and client-side to illustrate flow; replace with real submission logic on your server.
- Nav labels intentionally differ from common templates: Home / Who We Are / Offerings / Approach / Investment / Begin / Connect.

If you need the companion assets (SVG pattern) or other pages in the site, request the next chunk and specify which asset you want next.