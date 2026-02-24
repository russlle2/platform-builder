Chunk 4 — contact.html

Files included in this bundle:
- contact.html : Contact page with embedded interactive features and an inline SVG pattern.

Purpose
- This contact page is designed for the sound bath site (membership-first model). It focuses on connection, triage (mood→method), and a pricing micro-comparator.

Interactive features implemented (local JS only)
1) Mood-to-Method selector
   - A simple choice control allows visitors to pick a current state (e.g., Tense, Adrift, Wired, Flat, Celebratory).
   - The recommendation card updates title, description, and the primary CTA text dynamically.
   - Intended to help users pick an approach and to change the call-to-action to be more specific and motivating.

2) Pricing Comparator (monthly vs package)
   - Toggle between Monthly and Package pricing.
   - Numeric values animate smoothly when switching modes (small pop animation).
   - Pricing values are embedded on each plan as data attributes (data-month / data-package).

Notes about placeholders
- The page contains the following placeholders to be replaced during integration:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}} (not directly used on this page but available)
  - {{CITY}}
  - {{STATE}}

Accessibility & disclaimers
- A contraindications note is included near contact details. It is concise and invites disclosure and medical consultation when relevant.

Design details
- A unique SVG pattern is embedded inline within the page (no external assets required). If you prefer a separate asset file, extract the <svg> contents and save to assets/img/pattern.svg, then reference it via CSS.

Integration tips
- Replace placeholders server-side or during build with real values.
- The contact form is simulated (no network call). Wire the submission handler to your endpoint or an email service if needed.
- The primary CTA currently changes label based on mood and appends the placeholder primary label. Update wiring to pass a booking URL ({{PRIMARY_CTA_URL}}) or open a reservation modal.

Developer notes
- The nav labels intentionally diverge from generic labels; links map to the canonical file names for the site.
- Keep the embedded pattern as-is for local visual richness without external resources.

Contraindications wording
- Short, responsible phrasing is included. Modify text to reflect local medical or legal guidance if needed.

If you need the standalone assets (e.g., separate pattern svg file) or the other site pages for full integration, request the next chunk and I will generate the remaining files with consistent layout and interactions.