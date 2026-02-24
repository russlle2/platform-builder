Chunk: aromatherapy-2026-02-16T15-17-17-035Z-004

This chunk contains the contact page and developer notes for the Aromatherapy Practitioner site.

Files included:
- contact.html  — accessible contact page, contact form (disabled actual mail), membership CTA, safety-first copy and quick FAQ-style notes included inline.

Placeholders you should replace when integrating:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}}

Design & behavior notes:
- Layout family: earthy_warm; voice: warm_storyteller; offerModel: membership.
- Visual richness relies on CSS gradients, an embedded SVG fallback, and a referenced external SVG asset: assets/img/pattern.svg. Create a unique SVG at that path to match the earth-toned palette (terracotta, sage, cream). The page already references assets/img/pattern.svg as a repeating background.
- The inline <svg> provides a low-contrast dot pattern fallback so the page remains visually textured even if the external asset is missing.
- The contact form is intentionally simulated client-side and does not post to a server. Replace the submit handler with your API endpoint or form provider (e.g., Netlify Forms, Formspree, custom endpoint) when wiring up.

Accessibility & content:
- Form fields include labels and aria-live for status messages.
- Safety-forward copy emphasizes that aromatherapy supports wellbeing and is not a substitute for medical care. Important safety points (dilution, patch testing, pets, pregnancy) are included in the contact panel.

Integration checklist:
- Add a unique SVG file at assets/img/pattern.svg (use subtle dots/lines/leaf motifs; avoid heavy contrast).
- Replace placeholder tokens with live content.
- Hook up the contact form to your backend or form provider and handle spam/validation server-side.
- Confirm phone and email links are correct and accessible.

Developer tips:
- Keep the color variables in :root to tune the earthy_warm palette globally.
- The membership CTA links to /pricing.html; tailor the label or URL by replacing the placeholders.
- When adding server-side form handling, remember to maintain the safety disclaimer copy and store opt-ins (membership interest) properly.

Seed: 682215495
Slug: aromatherapy-2026-02-16T15-17-17-035Z-004
Layout family: earthy_warm
Voice family: warm_storyteller
Offer model: membership

End of chunk notes.