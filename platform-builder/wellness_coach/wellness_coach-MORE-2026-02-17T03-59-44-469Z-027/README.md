Contact page for the wellness coach template (chunk 4).

Files included:
- contact.html: A self-contained contact + interactive planning page.

Features:
- Session Planner: assemble a concise session brief from a few inputs and export it as plaintext (copy, download, email).
- 7-Day Challenge generator: pick a habit, intensity and start day, then generate a printable checklist with simple cues for each day. Export as text or print directly.
- No external assets or CDNs; background uses an embedded SVG pattern via data URL.
- Placeholders present for templating: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

How to use:
1. Open contact.html in a browser.
2. Use the Session Planner section to create a brief; click 'Assemble brief' then copy or download.
3. Use the 7-Day Challenge section to create a habit checklist; print or download the checklist.

Notes for integration:
- Links in the nav point to the other site pages: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html.
- No backend is required; the contact form simulates sending by copying intake text to clipboard.

Design intent:
- Focused, executive tone with tools that produce shareable, action-oriented artifacts for client intake and micro-habit practice.
- Keeps legal/ethical boundaries by avoiding medical claims; emphasizes outcomes, habits and frameworks only.

Developer hints:
- All JS is inline and minimal; can be extracted to a separate file if preferred.
- The embedded SVG is in the body::before CSS rule; swap or externalize as assets/img/pattern.svg if you include image assets in another build step.