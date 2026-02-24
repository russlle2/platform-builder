# holistic_medicine-MORE-2026-02-17T21-29-30-197Z-041 — contact chunk

This chunk contains the contact page and a short README for the holistic / integrative medicine template.

Files included:
- contact.html — Full contact page with an interactive Session Planner and scroll-triggered reveal effects.

How to use:
1. Place this file within the site folder alongside other pages (index.html, services.html, etc.).
2. The page references `assets/img/pattern.svg` for background patterning; include a matching SVG in that path when assembling the full bundle.
3. Open contact.html in a modern browser to try the local interactive features (no server required).

Key features implemented here:
- Accessible scroll-triggered reveal: Uses IntersectionObserver when user does not prefer reduced motion; otherwise reveals content immediately.
- Session Planner widget: Collects a few inputs (primary focus, session length, rhythm, duration, constraints, goals), generates a concise plain-text plan, and lets the visitor copy to clipboard or download a .txt file.
- Form stub: A contact form that demonstrates a friendly confirmation flow. Replace the stub with a real POST endpoint when integrating.
- Diagonal-split hero and card-based layout following the split_diagonal layoutFamily.

Placeholders used (do not replace in this file if you intend automated templating):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility notes:
- The reveal animation respects `prefers-reduced-motion`.
- Form fields include labels for screen readers.
- Copy-to-clipboard uses the Clipboard API when available and provides fallback messaging.

Design notes:
- This page is written in a warm, conversational tone and avoids medical guarantees. It frames the Session Planner as educational and preparatory, not diagnostic.

Development notes:
- No external assets, fonts, or JS libraries are used.
- To extend: wire contact form to a backend, add ARIA live regions for confirmations, or integrate analytics events for planner usage.

License: project/agency-specific; the files provided here are part of a multi-page template bundle.