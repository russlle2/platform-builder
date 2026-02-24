# Contact Page — holistic_medicine (chunk 4)

This bundle contains the contact page (contact.html) for the holistic/integrative medicine website and a README describing usage.

Files included:
- contact.html — self-contained contact and information page for {{BUSINESS_NAME}}. Contains hero, myth_vs_truth, pillars, case_notes, faq, and cta sections as required.
- README.md — this file.

Notes & integration
- The page is intentionally self-contained: CSS, SVG pattern, and layout are embedded inline and do not require external assets.
- Replace placeholders in the HTML where appropriate: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{CREDENTIALS}}.
- Content is written to emphasize education and whole-person care; avoid promising cures. This page follows the "intensive" offer model: a focused intake and follow-up process.
- Navigation links point to the other pages in the site (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html).

Accessibility & behavior
- Forms use semantic labels and have reasonable contrast. The contact form posts to {{PRIMARY_CTA_URL}}; you may wire this to your booking backend or mailing system.
- The FAQ, myth_vs_truth, and other content are static; if you want interactive accordions, add small JS enhancements.

Visual assets
- A decorative SVG pattern is embedded inline for reliability. If you prefer a shared file, create assets/img/pattern.svg and adapt the CSS to reference it.

Legal & clinical guidance
- This content avoids guarantees and focuses on educational recommendations and supportive care. For any medical/legal copy changes, consult your compliance reviewer.

If you need alternate tone variants, translated content, or a lightweight JS accordion enhancement, ask and I can provide updates.