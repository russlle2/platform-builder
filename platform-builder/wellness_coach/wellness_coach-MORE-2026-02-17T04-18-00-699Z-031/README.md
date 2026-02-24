Contact page and notes for chunk 4

Files included in this bundle:
- contact.html — Contact/connect page with two interactive widgets and accessible layout.

Purpose and features
- A compact contact page meant for the wellness coach site (layoutFamily: clinic_modern).
- Interactive components implemented with local JS (no external libraries):
  - Pricing Comparator: toggle between monthly and package pricing. Prices animate between values to make the transition clear.
  - Mood-to-Method selector: pick a current mood (Overloaded, Drained, Ready to act, Curious). The recommendation card morphs copy, the CTA label updates, and the CTA link receives a query tag for traceability.

Accessibility and behaviour
- Toggle is keyboard operable (Enter/Space) and uses aria-checked.
- Mood buttons are focusable and respond to Enter.
- The form submission is stubbed (prevents default) and displays a placeholder alert — replace with real endpoint integration.

Placeholders to replace in your environment
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Integration notes
- The page references an SVG pattern at assets/img/pattern.svg for subtle background texture. Ensure the asset exists in that path.
- The dynamic CTA initially displays the placeholder label {{PRIMARY_CTA_LABEL}} and points to {{PRIMARY_CTA_URL}}. The Mood-to-Method widget will overwrite both text and href when a mood is selected.
- Pricing amounts are embedded as data attributes on .price elements: data-month and data-package. The small animation interpolates integer prices.

Testing
- Open contact.html in a browser.
- Toggle the pricing switch — prices animate.
- Click a mood button — recommendation and CTA update. Verify the CTA href changes (it appends a utm_source=mood tag).
- Tab through controls to confirm keyboard accessibility.

Developer notes
- No external fonts, CDN, or images beyond the local SVG pattern are used.
- Copy avoids medical claims; phrasing focuses on habits, frameworks, and outcomes.
- To wire form to a server, replace the form onsubmit handler with fetch/XHR to your API endpoint.

End of chunk 4 README.