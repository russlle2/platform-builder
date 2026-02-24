This chunk contains the Contact page and a short README for the aromatherapy site template.

Files included in this bundle:
- contact.html : A standalone, accessible contact page styled with CSS and an inline decorative SVG pattern. It references placeholders that must be replaced during build or templating.

Placeholders present (must be replaced at deploy/runtime):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}}  (not used on this page but reserved globally)

Notes and implementation details:
- Voice/Design: "mystic_modern" with a "bold_playful" layout — the contact page uses vibrant gradients, pill UI, and a friendly CTA.
- Safety: The content includes explicit safety-forward messaging: no medical claims, recommends patch tests and consultation with healthcare providers when appropriate.
- SVG pattern: The page includes an inline SVG background pattern for visual richness. For build systems that expect a separate asset, provide assets/img/pattern.svg (recommended) matching the style in this inline SVG to satisfy the global uniqueness requirement.
- No external fonts or CDNs are used; typography falls back to system fonts.
- Form behavior: The contact form uses a mailto fallback (static template friendly). Swap in a server endpoint or third-party form handler as needed; if you wire an API, replace the form submit handler.
- Navigation: The contact page uses varied nav labels (Nest, Offerings, Emporium, Reserve) to maintain subtle uniqueness across the site.

Accessibility and progressive enhancement:
- Semantic HTML and ARIA ids are used for headings and the navigation landmark.
- Decorative SVG is aria-hidden.

Recommended next steps when integrating into a larger site:
1. Replace placeholders with environment or CMS values.
2. Provide assets/img/pattern.svg as a separate file for caching and reuse.
3. Hook the form to your preferred messaging or booking back-end if you want direct server-side submissions.
4. Ensure the Blends and Shop pages include safety-forward FAQ content about dilution, patch testing, pregnancy, and pets.

License: This template chunk is provided as a UI scaffold. No medical advice intended. If you display health-adjacent content, ensure proper disclaimers and professional oversight.
