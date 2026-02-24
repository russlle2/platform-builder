Contact page and micro features for the aromatherapy site (chunk 4)

Files included in this chunk:
- contact.html : Complete contact page with local JavaScript and CSS. Contains the Proof Gallery, credibility badges with accessible tooltips, and a Pricing Comparator micro-interaction (monthly vs package) with animated numbers.

Purpose and highlights:
- Proof Gallery: Rotating testimonials in the right-hand card. Dots below the testimonials allow manual selection, and rotation auto-advances every 5s. Credibility badges show short explanatory tooltips on hover and keyboard focus.
- Pricing Comparator: Toggle between "Monthly" and "Package" views. Prices animate numerically to the new values to make comparisons feel alive. Values are seeded in the script and can be adjusted.
- Contact form: Uses placeholders for integration: {{PRIMARY_CTA_URL}}, {{PRIMARY_CTA_LABEL}}, {{EMAIL}}, {{PHONE}}. The sample handler prevents default submission and shows a lightweight confirmation; replace with your form endpoint as needed.
- Safety-forward copy: The page includes FAQ items and guidance (dilution, patch test, pets, pregnancy, non-medical scope) in line with aromatherapy safety rules.

Placeholders to replace in template:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for implementers:
- assets/img/pattern.svg is referenced as a local background pattern. Create a unique SVG at that path to satisfy the site-wide uniqueness requirement.
- The nav uses a slightly different label set: Welcome, Offerings, Blends, Apothecary, Rates, Who we are, Reserve, Connect. Adjust links if you rename pages.
- Testimonials, badge text, and pricing values are inline in contact.html for easy editing.
- Accessibility: badges expose tooltips on :focus and :hover; testimonial controls are keyboard accessible and use ARIA-friendly attributes.

Testing tips:
- Open contact.html in a browser. Verify the testimonial rotation, badge tooltips on hover and tab focus, and the pricing toggle animating the numbers.
- Replace placeholders with real values and update PRIMARY_CTA_URL to wire the form to a booking or CRM endpoint.

Caveats:
- No external fonts or CDNs are used. Keep assets local.
- The contact form currently uses a simple JS alert for demo. Hook it to your backend or replace the form action as required.

If you need an accompanying assets/img/pattern.svg or additional pages from the site (index, services, blends, shop, pricing, about, book), request the next chunk and I will produce them with the unique SVG and matching styles.