Contact page + features for the holistic_medicine site (chunk 4).

Files in this bundle:
- contact.html — complete contact page with interactive features.
- README.md — this file.

Placeholders present in contact.html (keep as-is so build tooling can replace them):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Interactive features implemented (local JS only):
1) Mood-to-Method selector
   - Choose a mood (Weary, Wired, Uncertain, Curious, Steady).
   - Page updates a recommended approach summary and changes two CTAs:
     - "mood-cta" shows a context-aware label (e.g., "Start a brief course").
     - Primary CTA text is updated to include the mood context while keeping the configured link.
   - All behavior is client-side; no server calls.

2) Timeline planner (Three-Phase Roadmap)
   - Three phases (Grounding, Explore, Integrate) with editable week counts.
   - Inputs for each phase (phase1, phase2, phase3) update the visual timeline when "Update timeline" is clicked.
   - Includes a clear disclaimer: educational planning only, not clinical prescription.

3) Contact form (local demo)
   - Local simulated submission with a small delay and onscreen confirmation message.
   - Form logs a payload to the console for local testing — remove or replace when wiring to a real backend.

Design notes / constraints:
- Visual assets: the page uses an inline SVG pattern for decoration (no external images or CDNs).
- Accessibility: basic aria attributes and live regions included for dynamic updates.
- Tone: minimal, poetic, educational. No medical promises or cure claims; explicit disclaimers included.

How to test locally:
1) Open contact.html in a modern browser.
2) Click different mood buttons and observe the recommendation text and CTA label changes.
3) Change numbers in the phase inputs and click "Update timeline" to see the week counts change.
4) Submit the contact form to see the simulated submission and confirmation message.

Notes for integrators:
- Replace placeholders with real values during the build/deploy process.
- If you add an external pattern.svg file later, you can remove the inline SVG and reference the file.
- The primary CTA keeps its href as {{PRIMARY_CTA_URL}}; JavaScript only changes the displayed text.

License / attribution: internal template — adapt and reuse within your project.
