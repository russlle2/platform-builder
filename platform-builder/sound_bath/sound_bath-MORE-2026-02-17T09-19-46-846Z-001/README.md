Chunk 4 - contact.html

Files included in this bundle:
- contact.html : interactive contact page for the Sound Bath Events site (cohort model)

Purpose:
This chunk provides the contact page with two daring UI features implemented fully in vanilla JS and CSS:

1) Mood-to-Method selector
   - Buttons that represent a visitor's current state (e.g., "Worn down", "Wired & restless").
   - Choosing a mood updates the recommended program title, description, and the suggested cohort price.
   - The call-to-action text changes contextually (e.g., "Dive into Deep Drift Cohort").

2) Sound preference mixers (two instances)
   - "Sound Preference (Session)" and "Sound Preference (Group)" each provide gentle / medium / intense choices.
   - The two mixers combine to influence the displayed cohort slot price and CTA phrasing.
   - Both mixers are wired to the same recommendation engine; changing either updates the card.

Other important behaviors:
- The CTA builds a URL using the {{PRIMARY_CTA_URL}} placeholder and appends query params (mood, intensities, method, price) for clarity/tracking.
- The contact form is handled locally (demo): form submit shows a JSON summary via alert and resets the form.
- A contraindications disclaimer is prominently included and advises consultation for pregnancy, implants, epilepsy, etc.

Placeholders present in HTML:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for developers / integrators:
- No external assets or fonts are required. The page references an SVG pattern at assets/img/pattern.svg for the background (ensure that asset is provided in another chunk).
- This contact page assumes a cohort-oriented offering model; program names and price framing are intentionally distinct and playful.
- All JS is inline and unobtrusive; it can be moved to an external file if needed.

Accessibility & responsivity:
- Controls are large, touch-friendly, and have high-contrast states for the active items.
- The layout switches to a single column under 880px width.

Testing:
- Open contact.html in a browser.
- Click mood chips and change both mixers to see the method, description, price, and CTA update.
- Click the CTA to verify the query string is populated.
- Submit the contact form to see the demo summary alert.

End of chunk 4 README.