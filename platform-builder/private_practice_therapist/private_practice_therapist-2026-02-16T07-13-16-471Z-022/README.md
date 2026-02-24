# Chunk 4 — Contact page and README

This chunk contains two files for the Private Practice Therapist site using the aura_editorial layout family.

Files included:
- contact.html — full contact & intake page styled editorially. Contains:
  - Hero with prominent CTA using {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}
  - Quick contact card with {{PHONE}}, {{EMAIL}}, {{LICENSE}}, {{MODALITIES}}, {{CITY}}, {{STATE}} placeholders
  - Intake form (posts to {{PRIMARY_CTA_URL}} by default)
  - Check-in Snapshot (diagnostic ripple)
  - Pathway Outline (plan ripple)
  - Micro habits (micro_habits ripple)
  - Investment view (pricing ripple)
  - Privacy/confidentiality and crisis disclaimers, and scope/boundaries

- README.md — this file (usage notes)

Notes for integration:
- The site expects other pages to exist at: index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html.
- Required SVG assets referenced: assets/img/pattern.svg (used as subtle background). The full bundle should include unique SVGs per template (hero, avatar, pattern) in the assets/img directory.
- Placeholders must be replaced with real values or processed by your templating engine:
  - {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{THERAPIST_NAME}}, {{LICENSE}}, {{MODALITIES}}, {{CITY}}, {{STATE}}

Accessibility & legal:
- The contact page includes a clear crisis disclaimer and a confidentiality note. It also states scope and boundaries consistent with ethical practice.
- No external analytics, fonts, or CDNs are included.

Design considerations:
- Aura editorial: high-contrast, serif display heading, spacious layout.
- Navigation labels vary from other pages intentionally (e.g., "Insights" for FAQ, "Work" for booking) while keeping correct links.

If you need additional pages or assets packaged in the next chunk, request the specific files (index, about, specialties, approach, fees, faq, book) and the three unique SVG assets.