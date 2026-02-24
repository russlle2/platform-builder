# Contact page & planning tools (chunk 4)

This chunk provides the contact page and a README for the sound bath site scaffold.

Files included
- contact.html — Contact landing page with two interactive local tools:
  - Session Planner: build a short personalized plan (structure, suggestions) and export it as plaintext or download a .txt file. Uses only local JS; no network calls.
  - Events seat selector + packing list generator: choose seats (demo/local), see live availability, and generate a tailored packing checklist. Copy-to-clipboard supported.

Placeholders used
- {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}

Design notes
- Layout: zen_minimal. Clean, muted palette with modern type and mono accents for the planners.
- Voice: mystic_modern — language leans atmospheric yet practical.
- Unique navigation labels: Journey, Gatherings, Private, Investment, Stories, FAQs, Book, Contact.
- Contraindications: a clear, responsible disclaimer is included in the sidebar.
- Seed/slug metadata: Seed 2775808003 and slug sound_bath-MORE-2026-02-17T10-06-28-222Z-012 are present in the footer for traceability.

Testing
1. Open contact.html in a browser.
2. Session Planner: choose intention, duration, sounds; click "Create plan." Use "Copy text" or "Download .txt" to export.
3. Events: change seat counts next to an event to simulate reservation; the packing list updates. Use "Copy list" to copy checklist text.
4. Contact form: sends a demo/local confirmation message (no network request).

Notes for integration
- The page references an SVG pattern at assets/img/pattern.svg for background accents. That asset should be supplied in another chunk to complete the visual system.
- Other pages (index.html, events.html, etc.) are not included in this chunk and will be provided separately.

Constraints followed
- No external fonts or CDNs. No external network requests. No images embedded.
- The two files here are standalone and safe to open locally.

Fields changed vs prior templates
- Different headline metaphors and CTAs are used. Program naming and navigation label set are intentionally distinct.

If you need adjustments to copy tone, structure of the planner output, or the packing-list rules, tell me which parts to tune.