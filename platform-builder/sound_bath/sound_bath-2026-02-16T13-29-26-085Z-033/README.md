Chunk 4 — contact.html

Files included in this chunk:
- contact.html: The contact page for the sound bath site, optimized for a sensory, premium experience with a playful yet refined voice.

Notes & integration instructions:
- Replace placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{NEXT_EVENT_DATE}} where relevant.
- The page references an SVG background asset at /assets/img/pattern.svg. Ensure the file exists and contains the unique SVG pattern for the site (created in another chunk). The page also degrades gracefully if the SVG is missing.
- Visual approach: split diagonal feel using a skewed overlay, subtle gradients, and the SVG pattern. No external fonts or CDNs are used — replace or add local fonts if desired.
- Accessibility: form fields include labels and basic required checks. Integrate server-side validation and anti-spam (reCAPTCHA or honeypot) as needed.
- Form action: the form posts to {{PRIMARY_CTA_URL}}. Replace with your endpoint or integrate with your booking/contact system.
- Safety copy required by the brief is present: what to bring, flow, and contraindications/disclaimer.

Styling & behavior:
- All styling is inline in a <style> block for easy extraction. If you consolidate CSS, keep the CSS variables and color tokens to preserve the brand look.
- Minimal JS provides inline validation. Enhance with your JS framework or library if needed.

Developer tips:
- To vary navigation voice across pages, note this page uses 'Gatherings' and 'Reach Out' labels. Keep link hrefs consistent with site structure.
- The primary CTA label is pulled from {{PRIMARY_CTA_LABEL}} so copy changes propagate without code edits.

If you need the matching SVG pattern (assets/img/pattern.svg) or additional pages from the bundle, request the next chunk.