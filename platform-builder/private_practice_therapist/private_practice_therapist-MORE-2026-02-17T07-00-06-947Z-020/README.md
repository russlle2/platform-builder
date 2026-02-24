Chunk 4 — contact.html

This bundle includes the contact page (contact.html) for the private practice therapist site and a short README.

What this page contains:
- Glass-morphism aesthetic with a portable inline SVG-like pattern feel created by CSS gradients (no external assets).
- Header navigation linking to the site pages: index.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html.
- Contact card with practice phone and email placeholders: {{PHONE}} and {{EMAIL}}, and location placeholders {{CITY}}, {{STATE}}.
- Mood-to-Method selector (interactive): three mood labels (overloaded, stuck, in transition). Selecting a mood updates the recommended approach copy and updates the main CTA text. The default CTA is {{PRIMARY_CTA_LABEL}} until a mood is picked; the JS replaces it with a mood-specific CTA.
- Pricing Comparator: a compact toggle between Monthly and Package. Each plan block carries data-month and data-package attributes. Clicking the toggle animates the visible dollar numbers using requestAnimationFrame and an ease-out cubic easing.
- Contact form posts to {{PRIMARY_CTA_URL}} (in this static demo the submit is intercepted and shows an alert). Form fields: name, email, phone, message.
- Practice notes / disclosures: confidentiality, scope boundaries, and a clear crisis notice. The copy follows therapist rules (no medical claims, supportive language).

Files included in this chunk:
- contact.html — the interactive contact page
- README.md — this file, describing features and implementation notes

Custom behaviors (JS files are embedded in page):
- Mood-to-Method
  - Buttons with class .mood hold data-method, data-cta, data-desc attributes.
  - Clicking a mood toggles selection, fades text, and replaces the CTA label with the mood-specific CTA.

- Pricing Comparator
  - Toggle buttons (#optMonthly and #optPackage) switch modes.
  - Each .price element carries data-month and data-package values.
  - animateValue() performs smooth numeric transitions.

Placeholders to replace when deploying:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used directly on this page but present across the site)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Accessibility and notes:
- Toggle uses aria-selected attributes and prices area has aria-live="polite" for updates.
- The page is intentionally self-contained: no external fonts, images, or CDNs.

Developer notes:
- This contact page is written to slot into the broader site (pages index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html exist elsewhere in the project).
- For production, wire the form action to your scheduling or contact endpoint and remove the demo submit interception.
- Replace placeholder strings with real practice values and ensure the clinician's licensing and crisis procedures align with local regulations.

Design/Copy constraints observed:
- No absolute promises or medical claims; clear crisis guidance and confidentiality note present.
- CTA phrasing and program names are intentionally different from other templates (Root Sessions, Momentum Bundle, Stabilize Series).

End of README.