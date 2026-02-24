Contact page for the aromatherapy site (glass_morphism / warm_storyteller)

Files included in this chunk:
- contact.html : The contact page with interactive "Mood-to-Method" selector and an inline Aroma Wheel. Uses glass-morphism styling and a small embedded SVG pattern for background texture.

Placeholders present in the HTML (replace these server-side or with your build):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notable features implemented in contact.html:
- Mood-to-Method selector: clickable chips that change the featured method title, description, and update CTA text (in-page JavaScript only).
- Aroma wheel: an interactive SVG wheel (three concentric tiers for top/middle/base notes). Hover or touch updates a short description area. Tapping a tier suggests that note tier in the message.
- Contact form: simple client-side handler that gathers form fields and the selected mood; currently simulated with an alert. Replace with a real endpoint as needed.
- Safety-first FAQ: includes dilution, patch testing, pets, pregnancy guidance using "may support" phrasing and non-medical language.
- Navigation uses a distinct label set (Offerings, Crafts, Reserve, etc.) linking to the canonical pages in the project.

Design notes:
- The CSS uses glassy cards, subtle borders, and a warm green accent to fit the aromatherapy niche. No external fonts or CDNs are required.
- An inline SVG pattern is embedded in the page for visual texture. If you prefer a separate asset, extract the <defs> pattern block into assets/img/pattern.svg and reference it via CSS (adjust HTML accordingly).

Development / integration:
- To wire the contact form to a backend, replace the form submit handler in contact.html with a fetch() POST to your API endpoint and handle responses/errors.
- CTA placeholders should be replaced during templating with your real label and link.

Meta for builders:
- slug: aromatherapy-MORE-2026-02-17T14-40-03-552Z-020
- seed: 191837996
- layoutFamily: glass_morphism
- voiceFamily: warm_storyteller
- offerModel: retail_addon
- sectionPack used: hero, social_proof, benefits, process, faq, cta

Safety and copy guidance:
- Language intentionally avoids medical claims. Where benefits are mentioned, phrasing uses "may support".
- FAQ covers practical safety steps: dilution, patch testing, pregnant/nursing caution, pets.

If you need a standalone assets/img/pattern.svg created here, request the next chunk to include that file; this slice keeps the pattern inline per single-file constraint.