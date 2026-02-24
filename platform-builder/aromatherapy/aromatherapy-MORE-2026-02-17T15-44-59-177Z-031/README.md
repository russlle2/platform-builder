# Contact page — aromatherapy-MORE-2026-02-17T15-44-59-177Z-031

This chunk contains two files for the contact/connection experience of the aromatherapy membership site.

Files included:
- contact.html — the full contact page with interactive features
- README.md — this file

Features in contact.html:
- Mood-to-Method selector: choose a current mood (Calm, Focused, Anxious, Sleepy, Energized). The page updates a recommended method, updates the primary CTA label and URL, and fills a hidden field in the contact form.
- Aroma wheel: interactive SVG wheel with top / middle / base notes. Hovering a sector shows the note name, description, and role. Clicking a sector inserts a short snippet into the message textarea.
- Accessibility: keyboard-press activation for mood buttons, ARIA labels for navigation and the wheel, and an aria-live region for the note panel.
- Safety-forward FAQ: includes patch-test, dilution, pregnancy, pets guidance. Language avoids medical claims and uses "may support" phrasing.

Placeholders to replace in the template (do not remove):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Customization notes:
- The CTA updates use anchors like "{{PRIMARY_CTA_URL}}#calm"; replace or adapt as needed for routing.
- The contact form posts to {{PRIMARY_CTA_URL}} by default. Replace with your form handler if needed.
- The CSS references an SVG pattern at assets/img/pattern.svg for the header background. Ensure that asset exists in your build (unique pattern required for this project).

Testing locally:
1. Open contact.html in a browser.
2. Click a mood button to see method text, CTA label and URL update, and the form hidden field set.
3. Hover sectors on the aroma wheel to view note details. Click a sector to append a note snippet into the message field.

Safety and content guidelines:
- Copy avoids direct therapeutic or medical promises. All claims use permissive language such as "may support".
- The FAQ and form encourage disclosure of pregnancy, medications, and pets so practitioners can provide safe alternatives.

Developer notes:
- No external libraries are used; all JS and CSS are inline.
- The layout is responsive and will stack columns on narrow viewports.

If you need an alternate nav label set, different program names, or updated copy tone, edit the header nav and content sections in contact.html accordingly.