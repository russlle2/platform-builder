This bundle contains the contact page and a short README for the holistic membership site.

Files included:
- contact.html: The contact/connect page for the holistic membership website. It includes:
  - A glass-morphism UI and clinical-calm voice framing.
  - A "Mood-to-Method" selector: choose a current state and the page morphs the recommended approach, CTA text, and accent color. (Interactive JS, no external dependencies.)
  - A micro "Pricing Comparator" toggle: switches between monthly and package pricing with animated numbers.
  - A contact form that simulates sending and provides feedback.
  - Accessible controls with aria attributes and keyboard support for the switch.

Placeholders present (must be replaced server-side or with a build step):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes:
- The page references an SVG background at assets/img/pattern.svg. Add a unique pattern SVG at that path for consistent visuals.
- No external fonts, assets, or CDNs are used in the HTML; CSS is inline.
- The interactive components are implemented with plain JavaScript and are safe to extend.

Testing:
- Open contact.html in a modern browser. Try the Mood-to-Method buttons and the pricing switch. Submit the contact form to see simulated feedback.

Design decisions:
- The UI intentionally avoids absolute claims of cure and maintains an educational, supportive tone appropriate for holistic/integrative care.
- Membership framing is intentionally flexible: the content conveys an ongoing, paced support model rather than intensive single-session promises.

If you need a companion assets file (assets/img/pattern.svg) or additional pages (index.html, services.html, etc.), request the next chunk and specify which assets to include.