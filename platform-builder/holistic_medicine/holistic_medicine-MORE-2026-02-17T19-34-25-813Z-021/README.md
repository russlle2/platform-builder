Contact page — chunk 4 for "holistic_medicine" site

This file set includes the contact page (contact.html) and this README. The contact page implements a local interactive "Session Planner" and a whole-person inventory built with plain HTML, CSS, and JavaScript. No external assets or CDNs are required.

Features
- Session Planner form that collects name, primary goal, chosen focus areas (whole-person inventory), preferred cadence, and session length.
- Generates a plaintext summary that:
  - Lists selected focus areas
  - Provides a suggested intake agenda that maps each area to agenda items
  - Suggests follow-up cadence items for each area
  - Includes contact placeholders and a privacy note
- Copy summary button uses the Clipboard API (graceful fallback alerts on failure).
- Download button exports the plan as session-plan.txt.
- Reset button clears the form and output.
- UI uses warm earthy palette and references assets/img/pattern.svg for background pattern (unique SVG is provided elsewhere in the bundle).

Placeholders present in the file (replace before publishing):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for integrators
- contact.html is standalone and expects the site to include assets/img/pattern.svg in the site assets. The SVG should be unique for this theme.
- The planner logic is intentionally educational: it generates suggested agendas and cadence. It does not perform diagnostics and includes a privacy note.
- The export text includes placeholders. If you need the raw email/phone embedded, replace the placeholders during server-side rendering.

Testing
1. Open contact.html in a modern browser.
2. Fill name, goal, pick several areas and cadence, then click "Create plan".
3. Review the generated text area. Use "Copy summary" to copy to clipboard or "Download .txt" to save.
4. Try "Reset" to clear.

Accessibility and behavior
- The generated summary is placed in an element with aria-live for polite updates.
- Copy uses navigator.clipboard; ensure served over HTTPS for full support.

Developer tips
- To alter mappings, edit the areaMap object in the inline script.
- To change offered cadence labels, edit cadenceLabel() in the script.

Licensing
- This chunk contains no external libraries. Use and modify freely within the project.
