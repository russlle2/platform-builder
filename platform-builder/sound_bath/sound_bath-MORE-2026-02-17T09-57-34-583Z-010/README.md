Contact page for sound_bath (slug: sound_bath-MORE-2026-02-17T09-57-34-583Z-010)

What these files are

- contact.html — interactive contact / scheduling surface exposing the Mood-to-Method selector and two Sound Preference mixers. The page is designed to be self-contained: CSS + JS inline, no external assets required. Placeholders in the file need replacement in production: {{BUSINESS_NAME}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}.

How the interactive pieces work (local JS only)

1) Mood-to-Method selector
- Located in the left card as a segmented control (tabs). Options: Raw, Tired, Open, Ready.
- Choosing a mood updates the recommendation copy immediately and changes the primary CTA label to a context-aware action (e.g., "Reserve a Restful Slot").
- The CTA, when clicked, navigates to {{PRIMARY_CTA_URL}} with query parameters describing current selections: mood, tone, home. Example: {{PRIMARY_CTA_URL}}?mood=raw&tone=gentle&home=soft

2) Live Session Tone mixer
- Segmented control (Gentle / Medium / Intense). Selecting a tone updates the small tone recommendation area and adds subtle influence to the CTA (via title text).

3) Home Practice Intensity mixer
- Separate segmented control (Soft / Balanced / Deep). Selecting updates the home practice suggestion box.

4) Two quick-pref buttons
- "Collective Drift" and "Intimate Focus" pre-fill the message textarea and set mood/tone/home combinations to sensible defaults.

Form behavior
- The contact form is a front-end mock: clicking "Send message" will not perform network calls; instead it shows an in-page confirmation. The primary CTA redirects to the booking URL with query params as noted above.

Accessibility & UX notes
- Controls are simple buttons styled as segmented controls for keyboard accessibility.
- Color contrast is tuned for dark backgrounds; primary accent variables are at the top of the stylesheet for easy changes.
- A clear contraindications disclaimer is included near the form as required for responsible sound offerings.

Files included in this chunk
- contact.html
- README.md (this file)

Integration notes
- This project uses server-side replacement for placeholders. Make sure to substitute the placeholders with real values when deploying.
- The page references no external fonts or images. A decorative inline SVG texture is included inside the hero to provide visual interest without external assets. If you want a separate asset at assets/img/pattern.svg, replace or add an external file in another chunk; the inline SVG here is sufficient if no asset is provided.

Testing
- Open contact.html in a browser. Click mood/tone/home buttons and observe the recommendation areas and CTA text.
- Click the primary CTA to confirm navigation to the booking URL with query parameters. (In a local file context, the URL will be resolved relative to file origin.)
- Use the quick-pref buttons and click "Send message" to see the inline confirmation appear.

Design decisions & constraints
- Minimal, poetic voice in UI copy while keeping clear affordances for booking and contact.
- Unique labels for navigation to avoid reuse of common phrasing across templates.
- Two separate mixers satisfy the requirement for multiple intensity controls that influence program recommendations.

Contraindications reminder
- The contact form includes responsible guidance: attendees with pregnancy (early trimester), seizure history, cardiac devices, or certain psychiatric conditions should consult a provider and disclose during booking. This is informational and not medical advice.

If you need additional pages for this build (index, events, pricing, etc.), those are separate chunks. Replace placeholders in all pages before publishing.