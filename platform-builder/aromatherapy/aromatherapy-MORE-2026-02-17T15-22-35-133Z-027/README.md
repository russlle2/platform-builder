# Contact page chunk — aromatherapy template

This bundle includes two files for the contact page chunk of the aromatherapy site.

Files:
- contact.html — full contact page with inline styles and JavaScript.
- README.md — this file.

Features implemented in contact.html:
- Hero with quick contact details and CTAs. Uses placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}.
- Contact form (client-side demo only) that alerts on submit and resets the form.
- Proof Gallery: rotating testimonials (auto-rotates every 5s) and credibility badges with tooltips on hover. Implemented in local JS.
- Pricing Comparator: toggle between "Monthly" and "Package" pricing with animated number transitions. Implemented in local JS.
- FAQ safety notes: patch testing, dilution guidance, pets, pregnancy/nursing — language is safety-forward and avoids medical claims.
- Responsive layout with a playful, warm visual style via CSS only (no external assets).

Developer notes:
- The page references an SVG pattern at assets/img/pattern.svg for background patterning. If you are assembling the full site, include a unique SVG at that path so the hero will render the pattern correctly.
- The contact form is a demo and does not submit to a server. Replace the form handler with your backend integration or service of choice.
- All CTA links use placeholders; be sure to replace them with the concrete URLs and business values.

Accessibility & behavior:
- Toggle uses buttons and updates ARIA via role attribute on the wrapper; numeric animations are visual only.
- Tooltip text is injected to each badge from the data-tip attribute.

Copyright: template chunk for an aromatherapy practitioner site.
