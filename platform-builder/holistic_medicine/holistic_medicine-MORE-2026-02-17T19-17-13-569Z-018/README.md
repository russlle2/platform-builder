# holistic_medicine-MORE-2026-02-17T19-17-13-569Z-018 — chunk 4

Files included in this bundle:
- contact.html — The "Connect" page with interactive components.
- README.md — This file.

Purpose
- contact.html is the connective page for the holistic_medicine site. It includes the micro interactive features requested: a Pricing Comparator toggle and a Mood-to-Method selector.

Placeholders
The HTML uses these placeholders which should be replaced server-side or during build:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (can be present in other pages)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Interactive features implemented (local JS only)
- Pricing Comparator toggle: switch between "Monthly" and "Package". Prices animate between the values specified in data attributes. Animation uses requestAnimationFrame and a cosine easing for a soft count.
- Mood-to-Method selector: four mood buttons. Selecting a mood morphs the suggested approach (title and description) and updates the CTA copy and link. The primary CTA will also adapt to the active mood when clicked.

Design notes and constraints
- No external assets or CDNs are used. A soft SVG pattern is embedded inline via a data URL in CSS for background texture.
- No images are used; visuals are achieved with CSS and the embedded SVG.
- Tone is educational and supportive; there are clear disclaimers about non-guarantee of cures and emergency guidance.
- Navigation labels are intentionally different (Entry, Offerings, Symptoms, Philosophy, Tariffs, Story, Reserve, Connect) and point to the canonical filenames in the project.

Accessibility & behavior
- The pricing toggle and mood buttons are keyboard accessible as buttons.
- The contact form is non-submitting by default (onsubmit prevents default) and shows a simple alert to simulate send; replace with real endpoint as needed.

Integration notes
- Replace placeholders with real values prior to publishing.
- If you want an external assets/img/pattern.svg file instead of the embedded pattern, extract the SVG from the CSS data URL and save it at that path; then update the CSS background-image to reference it.

Developer notes
- To change plan names or price values, edit the data-monthly and data-package attributes on the elements with class "price".
- To add or adjust moods, update the methods object in the inline script and add corresponding buttons in the moods container with the correct data-key.

License
- This chunk is provided as-is for integration into the larger site.
