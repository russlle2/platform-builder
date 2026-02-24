# Contact Page — aromatherapy-MORE-2026-02-17T13-16-36-228Z-004

This chunk contains the contact page and a short README describing features included in this deliverable.

Files included:
- contact.html — the contact page for the aromatherapy site.

Key features implemented locally (no external services):
- Accessible, minimal contact form that simulates sending a message (no network requests).
- "Try it now — mini practice" modal with three guided micro-practices:
  - Breathing: a simple timed box-breathing routine (respects prefers-reduced-motion).
  - Journaling: prompt with a two-minute timer (or unlimited if reduced motion is preferred).
  - Intention: one-word intention setter with a subtle animation (disabled for reduced-motion users).
- Scroll-triggered reveal for page sections with a prefers-reduced-motion-safe fallback.
- Safety-forward copy and meta: reminders about dilution, patch testing, pregnancy and pets are included.
- Unique nav labels and CTAs appropriate to the site flow.
- Visual texture references a local SVG pattern at assets/img/pattern.svg (no external assets used).

Placeholders used in HTML (replace when generating the final site):
- {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}

How to test locally:
1. Place this file alongside the other site pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) and a matching assets/img/pattern.svg file.
2. Open contact.html in a browser.
3. Click "Try it now — mini practice" to interact with the guided exercise modal. Try turning on "Reduce motion" in your OS or browser to see the reduced-motion behavior.
4. Scroll the page to observe the reveal animations; reduce-motion users will see static reveals.

Accessibility notes:
- The modal uses aria-hidden toggling and Escape to close.
- Animations and timers respect prefers-reduced-motion; when reduced motion is requested, animations and strict timers fall back to simple text prompts.

Aromatherapy safety:
- The page intentionally uses cautious language: suggestions "may support" and do not make medical claims.
- Frequently asked questions (on the main site) should include dilution guidance, patch testing, pet-safety, and pregnancy guidance.

If you need the companion SVG pattern or any other pages in this chunk, request the asset and I will generate it following the same constraints.