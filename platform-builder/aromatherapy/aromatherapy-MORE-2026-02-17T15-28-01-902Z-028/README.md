Welcome to the contact page chunk for the aromatherapy site (slug: aromatherapy-MORE-2026-02-17T15-28-01-902Z-028).

Files included in this chunk:
- contact.html — The contact page with a guided practice modal, contact form, FAQ, and progressive reveal sections.

Key features and developer notes:
- Guided practice modal ("Try a short practice")
  - Implemented fully in-page with no external assets.
  - Provides three modes: breathing (3 min), micro-journaling (5 min), and intention/affirmation (6 min).
  - Pure JS timer with simple on-screen cues. Accessible: can be dismissed with Escape or clicking the backdrop.
  - No audio required; it is safe for quiet spaces.

- Scroll-triggered reveal
  - Elements using the class "reveal" animate into view via IntersectionObserver.
  - Respects prefers-reduced-motion: if the user requests reduced motion, reveal transitions are disabled and elements are shown immediately.
  - Provides a simple fallback for older browsers.

- Safety-first content
  - The FAQ includes dilution, patch testing, pet, and pregnancy notes. Language is careful: essential oils "may support" wellbeing, no medical claims are made.

- Placeholders
  - The template includes placeholders that must be replaced at build time or server-side rendering: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

- Navigation
  - The header contains links to the site pages: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html.
  - The Reserve link goes to book.html; Reach Out points at this contact.html page.

Testing locally:
1. Open contact.html in a browser.
2. Click "Try a short practice" — the modal opens. Choose a practice and press Start. Observe the timer and guidance.
3. Resize the browser and scroll to see reveal animations.
4. In system settings, toggle "Reduce motion" and reload to confirm reveals appear statically.

Accessibility notes:
- Modal can be closed with the Escape key and by clicking the backdrop.
- Color contrasts are friendly; customize tokens (accent colors) in the style block if needed.

Customization tips:
- Replace the placeholders with your live business data.
- The guided practice durations and messages are simple strings in contact.html; they can be tuned for tone and length.

This chunk intentionally avoids external assets and images. If you maintain an SVG pattern at assets/img/pattern.svg for the broader site, ensure it is in place for consistent branding across pages.

If you need a separate JS file or to integrate with a client-side router, extract the script block into a local file and import it in the page head/footer per your bundling setup.