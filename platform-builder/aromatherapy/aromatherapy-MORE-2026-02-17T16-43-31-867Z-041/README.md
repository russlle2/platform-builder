Contact page — chunk 4

This chunk contains two files for the aromatherapy site template: contact.html and README.md.

Purpose
- contact.html is the interactive Connect page for visitors to submit inquiries, explore an interactive aroma wheel, and preview rotating testimonials with credibility badges.
- README.md explains what is included and provides quick developer notes.

Features implemented (local-only, no external dependencies)
- Glass-morphism UI using plain CSS; dark, mystic-modern tone.
- Interactive Aroma Wheel: three segments (Top notes, Heart notes, Base notes). Hover reveals name + short description; click prompts to proceed to booking.
- Proof Gallery: three rotating testimonials with CSS transitions. Credibility badges include hover/tooltips; click on badges reveals tooltip on touch devices.
- Contact form: local demo handler (alerts then resets); replace with backend endpoint as needed.
- Accessibility: simple keyboard/hover support via native controls; form fields labeled.

Placeholders present and required to be replaced by the build system or templating engine
- {{BUSINESS_NAME}}
- {{TAGLINE}} (unused on this page but available site-wide)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Safety & FAQ
- The FAQ section follows safety-first phrasing: dilution recommendation, patch tests, pregnancy & medication notes, pet cautions. No medical claims are made; language uses "may support" and recommends consulting health professionals where relevant.

Developer notes
- This chunk assumes the SVG pattern file assets/img/pattern.svg exists elsewhere in the site bundle (background pattern). No external fonts or CDNs are used.
- The page is self-contained: CSS & JS are inline for portability.
- Navigation uses a unique set of labels: Home, Offerings, Alchemy, Apothecary, Plans, Story, Reserve, Connect.
- Contact form currently shows a demo alert. Wire to your serverless function or form endpoint by replacing the submit handler in the script.
- Aroma wheel: slices are simple absolutely-positioned elements with conic-gradient fills. Expand the notes data attributes to add more detail or link to lab sheets.
- Proof gallery rotation interval is 4200ms; adjust variable in script if needed.

Testing
- Open contact.html directly in a modern browser. Hover the wheel and badges; submit the contact form to see the demo alert.
- Verify placeholders are injected by your templating/build system before publishing.

Notes on uniqueness and constraints
- Copy avoids legacy phrasing from previous templates; program naming and CTAs are intentionally different (e.g., 'Reserve', 'Alchemy', 'Apothecary').
- All required safety sections are present.

If you need an alternate variant (light theme or separate JS file), I can extract inline scripts and styles into assets for maintainability.