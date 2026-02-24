Contact page — description and customization notes

This contact.html is the "Connect" page for the {{BUSINESS_NAME}} site. It is built to be self-contained: HTML, CSS and JS are embedded and rely only on the local pattern asset at assets/img/pattern.svg.

Files in this chunk:
- contact.html — page with an interactive "Mood-to-Method" selector, contact form, session framing, confidentiality & session-boundary accordions, and a respectful crisis footer.

Placeholders to replace (simple text replacement):
- {{BUSINESS_NAME}} — practice/clinician name
- {{TAGLINE}} — (not used here but available globally)
- {{PHONE}} — primary phone number (used in tel links)
- {{EMAIL}} — contact email (used in mailto links)
- {{PRIMARY_CTA_LABEL}} — (not used directly; the dynamic CTA text is set by the Mood selector)
- {{PRIMARY_CTA_URL}} — booking link (used to build the booking CTA href with a mood query param)
- {{CITY}} and {{STATE}} — simple location strings shown in the footer

Key interactive features and where to edit them:
- Mood-to-Method selector (JS object moodMap near the top of the inline script):
  - Each mood key (anxious, stuck, overwhelmed, grieving, curious) maps to title, copy, session suggestion, and cta label.
  - To add or change moods, edit the moodMap object and add or remove the corresponding button element in the HTML (.moods container).
  - The booking CTA will append a ?mood=... parameter to {{PRIMARY_CTA_URL}} so external booking tools can prefill reason/notes.

- Accordion (confidentiality & session boundaries):
  - Simple accessible pattern: each .acc-button toggles the following .acc-panel and updates aria-expanded.
  - Copy reflects typical confidentiality limits and cancellation expectations. Adjust phrasing as needed for your jurisdiction and license.

- Crisis footer:
  - Content instructs people to contact emergency services or emergency hotlines. This must remain visible and not be replaced with medical promises.

Form behavior:
- The form uses a mailto action as a simple fallback. For production, replace mailto with a server endpoint or integration with a secure intake system.
- The mood selected in the Mood-to-Method control is synchronized with the select in the form; when the booking CTA is clicked, the booking URL contains the mood as a query parameter.

Accessibility & privacy notes:
- The page uses basic ARIA attributes (aria-live for recommendation updates, aria-expanded on accordion buttons, role=tablist for moods). Review with accessibility tools for your audience.
- The copy intentionally avoids medical claims and guarantees. It includes confidentiality caveats and crisis guidance.

Styling & assets:
- No external fonts or vendor resources are used. The page references assets/img/pattern.svg for the header background. Replace that SVG with your preferred pattern while keeping the same path.

Customization tips:
- To change the visual emphasis colors, edit the CSS variables at the top of the style block (--accent, --accent-2, etc.).
- To change nav labels or structure, edit the <nav> block. Ensure links point to the correct files in the overall site.

Developer notes:
- The page assumes {{PRIMARY_CTA_URL}} is a valid absolute or relative URL. The script attempts to build a URL and will fallback to appending a query string if the provided value cannot be parsed as a URL.
- Consider integrating secure intake (server-side) when collecting personal information. Mailto is convenient but not ideal for confidentiality or record-keeping.

If you need a variant of this page (e.g., Spanish copy or a fully server-backed form), request a follow-up and include your server details for form handling.