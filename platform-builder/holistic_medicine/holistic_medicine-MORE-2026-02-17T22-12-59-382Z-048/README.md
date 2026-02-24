# Contact page — Holistic / Integrative Medicine site (chunk 4)

Files included in this chunk:

- contact.html — A self-contained contact page with a Session Planner widget and a scroll-triggered reveal system. This file references an SVG pattern at assets/img/pattern.svg (include a unique SVG there for full effect).

What this page provides:

- A responsive, accessible contact interface with placeholders to be replaced at deploy time:
  - {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}

- Navigation linking to the rest of the site pages: index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html. The nav labels were chosen to be distinct: Welcome, Pathways, Concerns, Method, Investment, About, Book, Connect.

- Scroll-triggered section reveal implemented in vanilla JS. It respects the user preference for reduced motion (prefers-reduced-motion) and reveals sections progressively when they enter view. No external libraries are used.

- Session Planner widget:
  - Let users select a primary focus, session length, frequency, and modalities.
  - Builds a concise plain-text plan summary geared toward a first-week practical approach.
  - Copy-to-clipboard and download-as-.txt features are implemented with local JS.
  - The planner produces a modest, educational plan and includes a brief medical disclaimer in the summary.

- Lightweight CSS for an asymmetric, masonry-like sidebar and clean contact layout. The page uses an assets/img/pattern.svg background reference (provide your custom SVG there).

Accessibility notes:

- Form controls include labels; the planner summary uses a <pre> with aria-live to announce updates.
- The reveal animation is disabled for users who prefer reduced motion.

Local testing:

1. Place this file in a web root with other site files (index.html, etc.).
2. Add an SVG at assets/img/pattern.svg or adapt the CSS background as desired.
3. Open contact.html in a browser. JavaScript runs without build steps.

Customization:

- Replace placeholders with real values at build/deploy time.
- Tweak planner options and copy text to match clinical and legal guidance for your practice.

Notes:

- This page intentionally avoids guaranteeing outcomes and uses supportive, educational language only.
- The contact form here is a simple front-end demonstration. Integrate server-side handling or a booking API as needed for production.

If you need the complementary assets (pattern.svg) or other pages (index.html, services.html, etc.), request the next chunk and include the seed/slug for continuity.