Project chunk: contact + README for holistic_medicine (zen_minimal, minimal_poetic)

Files included:
- contact.html — a poetic, minimal contact page tuned for an integrative medicine practice. It contains an embedded SVG pattern for visual texture and a lightweight contact form.

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Notes for implementers:
- Visuals are produced with CSS gradients and an inline SVG pattern located within contact.html. The broader site expects an external asset at assets/img/pattern.svg for consistency; add a matching SVG there if desired.
- Navigation labels intentionally vary («Offerings», «Your Story», «Investment», «Meet», «Book», «Connect») to satisfy subtle diversity across pages.
- The voice is minimal and poetic; content avoids medical guarantees and emphasizes education and whole-person support.
- Form posts to {{PRIMARY_CTA_URL}}/contact by default. Replace or wire to your backend or form provider.
- Accessibility: form fields include labels and simple client-side hinting. Server-side validation and privacy notice are required before production.

Integration tips:
- Ensure other pages (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html) follow the same visual system (CSS variables) for a cohesive look.
- Add assets/img/pattern.svg as a shared decorative resource if you prefer external SVG usage; the inline SVG here offers an immediate, unique pattern.

Legal/care note:
- This project is educational and design-focused. Language intentionally avoids clinical promises. Any clinical content or lab/test descriptions should include disclaimers and comply with local regulations.

Seed: 520561585
Slug: holistic_medicine-2026-02-16T19-50-38-567Z-011
Layout family: zen_minimal
Voice family: minimal_poetic
Offer model: events_series

End of chunk.