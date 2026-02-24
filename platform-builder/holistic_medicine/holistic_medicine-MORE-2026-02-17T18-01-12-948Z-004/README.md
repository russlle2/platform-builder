Contact page (contact.html) for the holistic_medicine site - chunk 4.

What this file includes:
- A focused "Connect" page with practical clinic contact information and a strong accessibility focus.
- An interactive "Session Planner" widget that:
  - Lets visitors select focus areas and preferred modalities.
  - Collects a preferred session length and short notes.
  - Builds a plaintext plan summary for sharing or saving.
  - Provides a Copy button (uses navigator.clipboard) and a Download .txt link (Blob + object URL).
- A scroll-triggered reveal system implemented with IntersectionObserver.
  - Respects user preferences for reduced motion via the prefers-reduced-motion media query.
  - If reduced motion is requested, elements are revealed instantly without animation.

Developer notes:
- All textual placeholders required by the project are present: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- The page references an external SVG pattern at assets/img/pattern.svg for background texture. That SVG is expected to be supplied in a different chunk as an asset.
- No external libraries or CDNs are used. Everything is self-contained in the HTML/CSS/JS.
- Accessibility:
  - Keyboard interaction for the option "chips" is supported (Enter/Space to toggle).
  - Form controls are labeled and the plan output uses aria-live for polite updates.
  - Navigation links include an aria-current indicator for the active page.

How to test locally:
1. Place this file in the same project folder as the other HTML pages.
2. Ensure an SVG file exists at assets/img/pattern.svg or replace the background-image in the CSS.
3. Open contact.html in a browser. Try:
   - Scrolling the page to see reveal animations (or enable reduced motion in OS settings to test the fallback).
   - Using the Session Planner: pick chips, set length, add notes, click "Build plan" then "Copy summary" and paste to verify clipboard.
   - Click "Download .txt" to download the plan as a text file.

Security & privacy:
- The planner builds text client-side only; nothing is sent to a server by default.
- The mailto: link is a convenience and opens the user’s email client.

Styling & structure:
- Designed to fit the asym_masonry layout family with clean cards and a soft neutral palette.
- The nav labels differ from typical sets to meet uniqueness constraints.

If you need the SVG pattern file or variations on the planner fields, I can produce them in the next chunk.