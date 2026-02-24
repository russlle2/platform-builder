# contact.html — Private Practice Therapist (chunk 4)

This chunk contains the contact page and a README for the private practice therapist site.

Files included:
- contact.html — full contact/connect page built for the "aura_editorial" layout family.

Placeholders used (replace these with real values):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{THERAPIST_NAME}}
- {{LICENSE}}
- {{MODALITIES}}
- {{CITY}}
- {{STATE}}

Notes for integration:
- Navigation links point to: index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html. Ensure those pages exist in the same site root.
- The hero and avatar reference local SVGs located at: assets/img/avatar.svg (present in other chunks). Confirm the assets are available when assembling the full bundle.
- Required site section pack (hero, story, framework, programs, pricing, testimonials, cta) is represented here so these elements ripple from the index to the contact page. Ensure the index includes the full pack and other pages echo these sections with varied headings and order.

Accessibility & clinical notes:
- The page includes a confidentiality/privacy note, a crisis disclaimer, and a scope/boundaries statement to align with therapist realism rules.
- Language avoids medical claims and is supportive and evidence-informed.

Behavior:
- The contact form uses a lightweight mailto fallback created via JavaScript. No serverside handler is included — replace the form action or add a server endpoint if you want form submissions captured directly.

Styling:
- Inline CSS follows the aura_editorial aesthetic: high contrast, bold typographic scale, editorial card layout. No external fonts or CDNs are used.

When deploying:
- Replace placeholders with actual content.
- Add the three required SVGs into assets/img/ if not already present: hero.svg, avatar.svg, pattern.svg.
- Verify licensing and sliding-scale language comply with local jurisdiction and professional guidelines.

If you need a version that posts to a server endpoint or integrates with a form service (e.g., Netlify Forms), I can provide the necessary form markup and instructions.