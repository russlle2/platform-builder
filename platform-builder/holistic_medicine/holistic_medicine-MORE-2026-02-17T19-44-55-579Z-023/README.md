Project: holistic_medicine-MORE-2026-02-17T19-44-55-579Z-023
Layout family: zen_minimal
Voice: executive_sharp
Offer model: vip_day

Chunk contents (this bundle):
- contact.html — contact page with an integrated Session Planner interactive widget and accessible scroll-triggered reveals.
- README.md — this file.

Placeholders present in files (replace for production):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented on contact.html:
- Nav with unique labels linking to the site pages (Home, Offerings, Health Topics, How We Work, Investment, Team, Schedule, Connect).
- Hero card and a compact contact form (client-side only, no backend).
- Session Planner widget that collects brief inputs and builds a plaintext session plan summary.
  - Copy-to-clipboard support with fallback.
  - Download as .txt via generated Blob URL.
  - Local-only: all processing happens in the browser (no external calls).
- Scroll-triggered reveal animation using IntersectionObserver.
  - Respects prefers-reduced-motion: instantly reveals content and disables animations when reduced-motion is set.
- Clean, minimal CSS; uses a local SVG pattern reference at assets/img/pattern.svg for page texture.

Accessibility and content notes:
- Planner output is rendered in a pre-wrapped block with aria-live for assistive tech updates.
- Copy and download controls are visible after a plan is generated.
- Copy button uses Clipboard API when available and falls back to execCommand.
- Content maintains an educational tone and avoids medical guarantees.

Development:
- To preview, open contact.html in a modern browser. No build step required.
- Replace placeholders with real values before publishing.

Design constraints satisfied:
- No external assets or CDNs referenced.
- No images embedded (pattern referenced as a local asset path).
- Unique navigation labels and CTA phrasing.
- Interactive features rely on local JS only.

Notes for next chunks:
- Ensure the unique SVG pattern is created at assets/img/pattern.svg in an earlier or future chunk.
- Other pages should vary section order and naming to maximize uniqueness versus previous templates.

Seed: 1841369373
Slug: holistic_medicine-MORE-2026-02-17T19-44-55-579Z-023
