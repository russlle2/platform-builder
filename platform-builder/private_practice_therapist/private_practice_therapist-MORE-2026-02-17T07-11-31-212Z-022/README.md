Contact page for the private practice site

Files in this bundle:
- contact.html — The contact page and guided micro-practice modal. Includes:
  - A contact form with client-side validation (demo alert on submit).
  - Confidentiality + crisis notice.
  - A guided, in-browser micro-practice (breathing, journaling, intention) that stores only to localStorage and runs purely on the client.
  - Scroll-triggered reveal animations with respects for prefers-reduced-motion.
  - No external assets or CDNs required; references an SVG pattern at assets/img/pattern.svg (create a unique SVG at that path in the site bundle).

How to test locally:
1. Place this file alongside the other site pages and assets/ directory. Ensure assets/img/pattern.svg exists.
2. Open contact.html in a browser (file:// works for client-only features).
3. Click "Begin a short practice" or the quick practice buttons to open the modal exercises.
4. Submit the contact form to see the demo acknowledgement.

Accessibility and safety notes:
- The modal traps basic keyboard interactions and closes on Escape or backdrop click.
- If the user has "prefers-reduced-motion: reduce" enabled, reveal animations are disabled.
- The page includes a clear crisis and confidentiality statement (not a replacement for emergency services).

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design considerations:
- Keep visual assets local; the page references assets/img/pattern.svg for the background motif.
- The micro-practice intentionally keeps data on-device; no network calls are made.

Developer notes:
- The scroll reveal uses IntersectionObserver and degrades gracefully.
- The breathing exercise is a timed loop designed for short cycles; adjust cycle length by changing maxCycles or interval durations in the script.
- Intents and journal entries are saved to localStorage under keys starting with "intents" and "practice_journal_".

Legal/clinical copy: text intentionally avoids guarantees and frames services as supportive. Ensure final copy is reviewed by the clinician for tone and accuracy.