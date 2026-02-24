Contact page and usage

This bundle contains the contact page and documentation for the aromatherapy practice site.

Files included:
- contact.html — Complete contact page with session planner widget and scroll-triggered reveals.

Key features implemented:
- Session Planner: interactive client-facing tool that composes a concise, plaintext session summary based on selected goal, duration, scent profile, and safety notes. Includes a Copy button and pre-composed mailto link for quick sharing.
- Scroll-triggered reveals: sections marked with data-reveal reveal on scroll using IntersectionObserver. Respects user's prefers-reduced-motion setting (disables reveal animation when reduced motion is requested).
- Safety-forward language: all plan text uses conservative phrasing ("may support") and includes dilution and patch-test guidance. FAQ includes notes on pregnancy, pets, and medical boundaries.
- No external dependencies or assets required. All behavior and visuals are local to the page.

Accessibility and progressive enhancement:
- prefers-reduced-motion respected in both CSS and JS.
- Buttons and interactive elements use semantic elements; the planner output uses aria-live for polite updates.
- The copy operation uses the Clipboard API with a fallback to document.execCommand when available.

Local testing:
1. Place contact.html in a folder served by any static server or open directly in a browser.
2. Edit placeholders in the file: {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}} as needed.
3. Interact with the Session Planner: choose options, click "Compose plan", then Copy or use the Email link.

Notes for integration:
- The planner composes general recommendations but avoids medical claims. Further tailoring should be performed during practitioner intake.
- If you maintain an assets folder for a unique SVG pattern, the page's visual uses an inline decorative SVG and will not require additional files.

If you need the rest of the site files (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) or an assets pattern file, request the next chunk and they will be provided with matching design and behavior.