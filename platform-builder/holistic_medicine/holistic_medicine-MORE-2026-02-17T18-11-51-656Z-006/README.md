Contact page and notes for bundle chunk

Files included:
- contact.html: Contact / connection page for the holistic site.

What this file contains:
- A fully self-contained contact.html that uses only local HTML/CSS/JS (no external CDNs).
- Two on-page "Session Planner" widgets (Quick and Detailed) that build a plaintext plan summary and provide a Copy button.
- A scroll-triggered reveal system using IntersectionObserver. It respects the user's prefers-reduced-motion setting and will skip animation when reduced motion is enabled.
- Accessible markup choices: visible focusable controls, aria-live regions for plan outputs, and simple semantic structure.
- The page references an SVG pattern at assets/img/pattern.svg for background texture. That asset should be placed at that path in the bundle.

Placeholders included (to be templated):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

How the planners work:
- Quick Planner: choose a focus, length, cadence, and a short note. Click "Build plan" to render a plaintext summary, or "Copy" to copy to clipboard.
- Detailed Planner: choose modules and goals, set cadence/energy, and click "Create summary" to render a multi-line plan. "Copy" copies the plan text.

Copy behavior:
- Uses navigator.clipboard when available. Falls back to a temporary textarea + document.execCommand('copy') for older browsers.

Accessibility & motion:
- If the user prefers reduced motion, reveal animations are disabled and content appears immediately.
- Plan outputs live-update in aria-live regions for assistive tech announcements.

Notes for integrators:
- The design uses local CSS variables and simple layout so it can be adapted to other pages.
- Ensure assets/img/pattern.svg is present and unique per the project requirements.
- This contact page intentionally avoids medical guarantees and includes a short disclaimer phrase in the footer.
