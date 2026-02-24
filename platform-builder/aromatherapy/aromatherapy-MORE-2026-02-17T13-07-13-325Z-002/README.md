# aromatherapy-MORE-2026-02-17T13-07-13-325Z-002

Project seed: 2189203043
Layout family: zen_minimal
Voice: practical_guide
Offer model: events_series

This bundle contains the contact page and a README for a small aromatherapy practice site. It focuses on safety-first interactivity and tools that practitioners can use on the page.

Files in this chunk:
- contact.html — contact page with two client-side interactive tools:
  - Session Planner: assemble a short session plan (client, goal, duration, frequency, notes) and export a plaintext summary via copy or download.
  - Blend Builder: choose a "vibe", carrier, and client type to build a conservative, non-medical blend card and a suggested dilution guide. Copy or download the result.

Notes and how to use
- Placeholders in templates must be replaced by your values when deploying: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- assets/img/pattern.svg should be placed in the assets/img folder. The page references that file for the subtle background pattern.
- No external fonts or CDNs are used; everything is local and relies on system fonts.

Safety and copy requirements
- Language is intentionally safety-forward. The site uses "may support" and conservative phrases and does not make medical claims.
- The FAQ block includes patch test, dilution, pregnancy, and pet notes.

Customization
- Replace placeholder strings when building templates or serving files.
- Adjust vibe -> essential oil mappings in the script (vibeMap) to match your inventory and clinical preferences. Keep safety notes if you add oils with known contraindications (phototoxicity, pregnancy, etc.).
- The dilution computation is intentionally conservative; modify computeDilution() only if you are confident in safe practices.

Integration
- This contact page fits into a multi-page site with these pages expected: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html.
- Navigation labels are intentionally different from default sets; ensure links match your final filenames.

Accessibility & progressive enhancement
- The interactive features work with JavaScript; the page has basic fallbacks (text areas) and clear labels.

License & notes
- This deliverable is a front-end template. All health and safety statements are non-medical educational content. For clinical decision-making, consult licensed professionals.

If you need further customization (print-ready blend cards, a local database of clients, or integration with booking APIs), request the next chunk and specify which feature to prioritize.