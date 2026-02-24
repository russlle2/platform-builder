Chunk 4: contact.html + README for holistic_medicine site

Files included:
- contact.html: Contact page with an interactive "Session Planner" widget and a prefers-reduced-motion aware scroll reveal.

How to test locally:
1. Place this file in your site folder alongside the other pages (index.html, services.html, etc.).
2. Ensure you have the site asset: assets/img/pattern.svg (this project uses a custom SVG pattern referenced in CSS).
3. Open contact.html in a browser.

Features implemented:
- Session Planner widget
  - Pick a primary concern, session length, modalities, frequency, and short goals.
  - "Create Plan" builds a plaintext summary optimized for copying or pasting.
  - "Copy Summary" uses the Clipboard API with a fallback for older browsers.
  - Output includes suggested micro-habits and a brief first-session outline.
  - Disclaimer included: educational content, not medical advice.

- Scroll-triggered reveal animations
  - Uses IntersectionObserver to reveal elements with the .reveal class.
  - Respects prefers-reduced-motion: when the user prefers reduced motion, elements are revealed immediately without animation.

Accessibility and design notes:
- Summary area has aria-live="polite" and is focusable (tabindex=0) so screen reader users can access generated text.
- Contact form is a lightweight local handler (no external network calls) that provides immediate feedback; replace with your preferred backend endpoint for production.

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Developer notes:
- No external fonts or CDNs are referenced; adjust font-family stacks as needed.
- The Session Planner intentionally produces plaintext (\n-separated) so it can be copied into notes or email clients.
- The page intentionally avoids medical promises and maintains an educational tone.

If you need a different layout or an additional export option (e.g., download .txt), tell me and I will add it.