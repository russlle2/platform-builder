# holistic_medicine-MORE-2026-02-17T21-35-40-592Z-042 — Chunk 4

This bundle includes the contact page and a short README for the holistic / integrative medicine template.

Files:
- contact.html — Contact page with navigation, messaging form (client-side simulated), and an on-page "Session Planner" interactive widget. The planner builds a plaintext session plan, supports copying to clipboard and downloading as a .txt file. It also implements scroll-triggered section reveals with respect for prefers-reduced-motion.

Placeholders used in templates (do not replace in source until runtime):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes on behavior and developer guidance:
- The contact form is simulated (no backend) and will alert the user on submit. Adapt to your server endpoint by changing the form submit handler in contact.html.
- The Session Planner builds a concise plan with a 1-session outline and a 4-week starter sequence. It is intentionally educational and does not make medical claims.
- Scroll-triggered reveals use IntersectionObserver unless the user prefers reduced motion, in which case sections are revealed instantly.
- The page references a local SVG at assets/img/pattern.svg for decorative background. Provide a unique pattern SVG at that path for final builds.

Accessibility:
- Reduced-motion preference is respected.
- The plan output uses aria-live="polite" so screen readers will announce updates.

Local testing:
1. Place this file alongside the rest of the site HTML files (index.html, services.html, etc.) and ensure assets/img/pattern.svg exists.
2. Open contact.html in a browser. For full JS features, serve the page over a local static server (e.g., `python -m http.server` or similar) to avoid any clipboard/download quirks.

License: Provided as-is for use with the holistic_medicine layout family. No external assets or CDNs are included.