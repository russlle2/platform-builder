Contact page and local notes

Files in this bundle:
- contact.html — the site contact page with an embedded "Try it now" guided practice modal, scroll-triggered reveal animations, a contact form, and an FAQ covering dilution/patch tests/pets/pregnancy.

How to use locally:
1. Place contact.html into your site folder alongside the other pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html).
2. Ensure an SVG pattern exists at assets/img/pattern.svg (the page references this path for background texture). No external fonts or CDNs are required.
3. Open contact.html in a browser. The guided practice modal is fully client-side and requires no server.

Notes on features:
- "Try it now" modal includes three modes: Breathing (animated ring), Journaling (prompts), and Intention setting (simple input).
- Scroll-triggered reveal uses IntersectionObserver, with respect for prefers-reduced-motion (reveal disabled/instant when reduce-motion is set).
- The contact form is a front-end demo only; it shows a confirmation alert on submit but does not send network requests.

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Safety & copy guidance:
- All aromatherapy language is safety-forward. Avoid medical claims; use "may support" phrasing in public-facing copy.
- Include dilution, patch test, pets, and pregnancy guidance in FAQ or intake forms.

If you need an example assets/img/pattern.svg created in this project, I can generate a simple unique SVG pattern file next.