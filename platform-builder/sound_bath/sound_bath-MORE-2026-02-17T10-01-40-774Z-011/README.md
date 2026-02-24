Chunk 4 — contact.html

This bundle contains the contact page and a README for the sound bath events site (layoutFamily: glass_morphism; voiceFamily: practical_guide; offerModel: events_series).

Files included in this chunk:
- contact.html — the interactive contact & recommendation page.

Key features implemented in contact.html:
- Mood-to-Method selector: pick a mood (Anxious, Foggy, Tired, Curious, Restless). The page updates a recommended program title, description, and updates the CTA text accordingly.
- Sound preference mixer: three intensity options (Gentle, Medium, Intense). Changing intensity reshapes the program recommendation and CTA.
- The same intensity controls are available both in the header section and inside the contact form for consistency.
- Contact form collects name, email, phone, preferred session type, mood, intensity, and a message. Submitting builds a query string and redirects to {{PRIMARY_CTA_URL}} (or book.html when placeholder unresolved) so the booking flow can pick up prefill data.
- Glass-morphism visual style implemented with CSS; an inline unique SVG pattern is included as a decorative background (no external assets).
- Includes a responsible contraindications note with recommended caution for pregnancy, epilepsy, cardiac devices, and recent trauma.
- Social proof, short process description, and an overview of formats appear on the page.

Placeholders present (must be substituted by the generator/system):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used in visible copy but available)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Nav links use a different label set but link to the core pages:
- index.html (label: Gatherings)
- events.html (label: Calendar)
- private-sessions.html (label: Private)
- pricing.html (label: Invest)
- about.html (label: Who We Are)
- faq.html (label: Help)
- book.html (label: Reserve)
- contact.html (label: Connect)

Notes for integrators:
- The booking redirect uses the placeholder {{PRIMARY_CTA_URL}}; if unresolved it falls back to book.html in the script. Ensure server-side substitution or correct client-side replacement for production.
- The page intentionally avoids external fonts and images. The SVG pattern is embedded; if you want a separate asset file, extract the <svg> block to assets/img/pattern.svg and adjust CSS accordingly.
- The recommender object in the script contains the mapping from mood+intensity to program title/blurb/CTA text. Modify as needed to align with offerings and pricing language.

Accessibility & safety:
- Mood and intensity controls are keyboard-interactive buttons, with aria groupings.
- Contraindications provided; for production, consider linking to a fuller medical disclaimer and adding consent checkboxes if required by local regulations.

This chunk is self-contained and ready for inclusion with the other pages of the site.
