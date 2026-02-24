Project chunk: contact + notes

Included files:
- contact.html — the contact & micro-interactions page for the holistic clinic site.

Purpose and quick start:
- Open contact.html in a browser to view the page. It's self-contained (CSS and JS inline).

Features implemented locally:
- Rotating Proof Gallery: cycles three testimonial snippets every ~5 seconds. Credibility badges support keyboard focus and hover tooltips.
- Pricing Comparator: a toggle (Monthly / Package) with animated numeric transitions across three plan cards. Controls support keyboard activation (Enter/Space).
- Contact form: client-side simulated submission with a short acknowledgement (no backend integration in this chunk).

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Assets:
- This page references a patterned SVG at assets/img/pattern.svg for the header background. Ensure a unique SVG file is placed at that path for visual consistency across the site.

Accessibility notes:
- Interactive elements include keyboard support: price switch responds to Enter/Space; badge tooltips are reachable via Tab and show on focus.
- The proof viewport uses aria-live="polite" so screen readers note testimonial changes.

Design notes:
- Navigation labels intentionally differ from standard sets (Programs, Investment, Philosophy, Events) to provide a fresh information architecture for this site.
- Copy is educational and non-claiming; the footer contains a short disclaimer advising the site is not a replacement for urgent care.

Developer tips:
- To integrate server-side form handling, replace the form submit handler and set a proper action or wire up an XHR/Fetch POST to your endpoint.
- Pricing numbers are stored in data-monthly and data-package attributes on each .price element. The animation uses requestAnimationFrame for a smooth transition.

Chunk constraints:
- This chunk includes only contact.html and this README. Other pages and the SVG asset are expected in separate chunks.

License / attribution:
- Template code is provided for project use; adapt as needed for local styling and accessibility reviews.