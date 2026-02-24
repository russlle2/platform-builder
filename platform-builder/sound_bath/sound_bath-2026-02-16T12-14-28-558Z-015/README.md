# sound_bath — contact page (chunk 4)

This bundle contains the contact page and a README for the sound bath site scaffold.

Files included:
- contact.html — full contact / booking page tailored to the "zen_minimal" layout and "playful_premium" voice.

Placeholders to replace:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{FACILITATOR_NAME}}
- {{VENUE_NAME}}
- {{NEXT_EVENT_DATE}}

Notes & implementation details:
- Visual richness is provided via CSS gradients and a tiled SVG background expected at /assets/img/pattern.svg. Supply a unique pattern.svg for the site to complete the look.
- The contact page includes sensory copy: "what to bring", contraindications disclaimer, and a clear session flow. Instruments listed are intentionally varied (monochord, tuning forks, chimes) to avoid repetition across pages.
- Navigation labels are tuned to differ from other templates ("Gatherings", "Private", "Rates"). Ensure other pages use slightly different labels to satisfy uniqueness requirements.
- The contact form posts to {{PRIMARY_CTA_URL}} and redirects there with query params for a lightweight simulated booking flow.
- No external fonts or CDNs are used — replace fonts in CSS if you add local assets.

Accessibility & behavior:
- Uses semantic HTML and sufficient color contrast for a premium, sensory palette. Test with real content and ensure placeholders are sanitized when replaced.

How to use:
1. Replace placeholders in contact.html with real values.
2. Ensure /assets/img/pattern.svg exists and is a unique SVG pattern.
3. Serve the static files (any static host or local server) and verify form redirect behavior.

Design knobs to tune:
- Root CSS variables (accent, colors, radius) are declared in :root.
- Adjust background-size in the body style to control pattern density.

Generated with layoutFamily=zen_minimal, voiceFamily=playful_premium, offerModel=intensive.
