# contact.html + README for private_practice_therapist

This bundle contains two files for chunk 4 of the site: contact.html and README.md. The page uses glass-morphism styling and includes two interactive local features implemented in plain JavaScript:

Features implemented in contact.html
- Mood-to-Method selector: choose a present state (Overwhelmed, Stuck, Anxious, Grief, Transition). The page updates the recommended approach and changes the CTA text to match the selected mood. The CTA link keeps the placeholder {{PRIMARY_CTA_URL}} so it can point to your preferred booking endpoint.
- Pricing Comparator toggle: switch between "Monthly" and "Package" pricing views. Numbers animate smoothly so visitors can compare options.
- Contact form: local client-side validation then redirects to /book.html with query parameters. This is a placeholder flow appropriate for static site prototypes.

Developer notes
- Placeholders used in the template that must be replaced or processed by your templating system: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- Navigation uses custom labels: Welcome, Therapist, Focus Areas, Method, Investment, Answers, Book, Connect. Links are relative to the site root.
- No external assets or CDNs are referenced. The page references a background SVG at assets/img/pattern.svg; ensure you provide a unique SVG there for the complete visual identity.

Therapist content & compliance
- The copy avoids medical claims and guarantees and includes confidentiality, scope boundaries, and a crisis note to guide urgent situations.
- The tone is clinician-forward and calm, with a playful-premium edge in visual styling.

How to run locally
1. Place this file in your web root alongside the other pages (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html).
2. Provide the assets/img/pattern.svg file in the indicated path.
3. Serve the folder with any static server (e.g., `python -m http.server` or a dedicated static-site host).

Customization suggestions
- Replace placeholder strings with real values from your CMS or templating pipeline.
- Update pricing numbers in the script to reflect your current rates.
- If you want the form to POST to a backend, replace the onsubmit handler and set the action appropriately.

Accessibility & responsiveness
- Basic keyboard and focus flows are supported; the layout is responsive and collapses to a single column on narrow screens.

License
- Use and adapt as needed for your private practice site. Keep clinical notices and crisis guidance intact.

Generated for: niche=private_practice_therapist, layoutFamily=glass_morphism, voiceFamily=playful_premium, offerModel=cohort.