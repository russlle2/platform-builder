Contact page — chunk 4

Files included:
- contact.html: The contact page with a hero, gallery, "what to expect", objections (contraindications), a strong CTA, and an interactive Session Planner widget.

Features implemented here:
- Split-diagonal hero visual via CSS, referencing assets/img/pattern.svg for a subtle texture.
- Accessible scroll-triggered reveal animation: uses IntersectionObserver; respects prefers-reduced-motion and disables animations for reduced-motion users.
- Session Planner widget (entirely local JS): build a plaintext summary from form inputs, copy to clipboard, and download as a .txt file. Designed for quick sharing with the studio.
- Contraindications disclaimer included in the objections section (responsible medical note).
- Navigation uses a distinct label set to match design constraints.

Placeholders used (replace when deploying):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Developer notes:
- The page intentionally references assets/img/pattern.svg. Provide a unique SVG file at that path (not included in this chunk) to render the background pattern.
- No external fonts or CDNs are used.
- The planner output includes contact placeholders so users can copy & paste the generated plan into an email.
- If you need the planner to POST to an endpoint, wire up the build button to send a fetch request with the generated text.

How to test locally:
1. Open contact.html in a modern browser.
2. Scroll the page to see section reveals. To test reduced-motion, toggle the OS preference or simulate it via dev tools.
3. Fill the Session Planner fields and press "Build plan". Use Copy and Download to verify clipboard and file download behaviors.

Accessibility suggestions:
- Ensure assets/img/pattern.svg has sufficient contrast if used directly (it is applied with low opacity by default).
- Consider adding aria-live or confirmations for download/copy for screen reader users.

Chunk context:
- This is chunk 4 of the site. Other pages (index, events, private-sessions, pricing, about, faq, book) are in other chunks. Ensure consistent placeholder replacement across files during deployment.