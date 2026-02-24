# Contact page (chunk 4)

This bundle contains the contact page and a short README for the Private Practice Therapist site template.

Files included:
- contact.html — full contact page with interactive tools and clinician notices
- README.md — this file

Purpose & features
- Mood-to-Method selector: choose a present emotional/clinical state and the page "morphs" a suggested approach and updates the CTA label.
  - Options: Overwhelmed, Stuck / Plateau, In transition, Weekly support.
  - Implementation: client-side JS swaps text with a subtle fade and changes the CTA label; clicking the CTA navigates to the booking URL with an intent query parameter.

- Pricing Comparator: toggle between "Monthly" and "Package" presentations. Prices animate smoothly using requestAnimationFrame and an ease-out curve.
  - Plans are named to reflect program framing rather than conventional labels: Foundations, Focus Sessions, Guided Series.
  - Pricing numbers are placeholders; replace them in the script or via server-side rendering as desired.

- Accessibility and clinician notes:
  - Includes confidentiality note, scope boundaries, and a crisis instruction line.
  - Avoids medical claims or guarantees, and uses supportive clinical language.

Placeholders to populate
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used directly on this page but available globally)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design notes
- No external assets, fonts, or CDNs are used.
- Layout is responsive and keeps interactive components local to the page.

How to run locally
1. Place this file beside the other pages in the project root (index.html, about.html, etc.).
2. Open contact.html in a browser. All interactions run client-side.

Customization tips
- To change plan prices, edit the monthly and package objects near the top of the pricing script in contact.html.
- To change mood options or copy, edit the `map` in the Mood-to-Method script block.
- The CTA redirects to `{{PRIMARY_CTA_URL}}` when present; otherwise it falls back to book.html. Adjust that logic to match your booking solution.

Clinician reminder
- Keep wording factual and supportive. Do not offer guarantees or clinical promises. Maintain confidentiality statements and crisis instructions.

License
- Use and adapt for private practice websites. No external dependencies are required.
