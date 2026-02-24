Chunk 4 — contact.html and README

Files included:
- contact.html : A complete contact page for the holistic_medicine site (slug: holistic_medicine-MORE-2026-02-17T21-23-43-866Z-040).

Purpose and highlights:
- Contact interface with a simple form, contact details using placeholders for {{PHONE}} and {{EMAIL}} and location placeholders {{CITY}}, {{STATE}}.
- Guided exercise modal implemented in local JS only: three modes (Breathing, Journaling, Intention). No external assets or libraries.
  - Breathing mode: visual breathing circle and timed cycle using requestAnimationFrame; controls for Start / Pause / Reset.
  - Journaling mode: textarea with Save (stores to localStorage) and Clear.
  - Intention mode: small input with Save and Clear (stores to localStorage).
- Scroll-triggered reveal for sections using IntersectionObserver. Respects prefers-reduced-motion: if the user prefers reduced motion, sections reveal immediately with no animation.
- ARIA roles and basic accessibility considerations (modal role=dialog, focus handling, keyboard Escape to close).
- Uses a patterned background image reference to assets/img/pattern.svg; no external fonts, CDNs, or images shipped in this chunk.

How to test locally:
1. Place this file in your project root or appropriate page folder.
2. Open contact.html in a browser (no server required for basic testing).
3. Click "Try the short practice" to open the modal. Test the three modes.
4. Test the breathing animation and controls. Use the Escape key or Close button to dismiss.
5. To verify reduced-motion behavior: set your OS/browser to "Reduce Motion" and refresh — reveal animations should be disabled.
6. Use the form to test client-side validation (email or phone required) and mock submit.

Notes and constraints:
- Placeholders must remain as tokens: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- This chunk intentionally contains only the contact page and README. Other site assets (pattern.svg) should be provided in other chunks.
- Copy avoids the banned signature phrases and keeps an educational, supportive tone. No cures or guarantees are stated.

If you need variants (light theme, different CTA phrasing, or a version that wires the form to an API), I can produce an updated file.