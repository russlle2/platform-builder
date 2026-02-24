# {{BUSINESS_NAME}} — Wellness Coach Site (aura_editorial)

This repository contains a small editorial-styled wellness coach web template optimized for clarity, habit-based frameworks, and conversion.

Files generated in this chunk:
- contact.html — contact page with form, mini-program summaries, lead magnet mention, and contact details.

Placeholders (replace these in your deployment):
- {{BUSINESS_NAME}} — business or brand name
- {{TAGLINE}} — short tagline
- {{PHONE}} — phone number (tel: links included)
- {{EMAIL}} — contact email (mailto: links included)
- {{PRIMARY_CTA_LABEL}} — primary button label (e.g., "Book a Call")
- {{PRIMARY_CTA_URL}} — primary CTA URL or form action
- {{COACH_NAME}} — coach's full name
- {{CREDENTIALS}} — coach credentials for footer
- {{CITY}} and {{STATE}} — locality for contact card

Design notes:
- Layout family: aura_editorial — high contrast, bold typographic scale, editorial rhythm.
- Voice: coach_friend — energetic, reassuring, non-guru.
- The contact page intentionally "ripples" required sections (hero, framework, programs, pricing, testimonials, CTA) as concise references while keeping focus on conversion.

Assets:
- The page references local SVGs in assets/img/: avatar.svg, pattern.svg, hero.svg. Create these files locally (unique vector art is required).

Accessibility & UX:
- Form fields are labeled via placeholders and aria-label on the form; expand labels as needed for full WCAG compliance.
- All external links are relative to the generated pages: index.html, about.html, programs.html, pricing.html, testimonials.html, book.html, contact.html.

How to use:
1. Replace placeholders with your real content or use a simple templating script to inject values.
2. Provide the SVG assets under assets/img/ to match the references used in contact.html.
3. Host static files on any static hosting provider (Netlify, Vercel, GitHub Pages).
4. If using the form, set {{PRIMARY_CTA_URL}} to your form endpoint or serverless function.

Developer tips:
- Keep all fonts local or rely on system fonts; no external fonts or CDNs are referenced.
- Follow the editorial color scale in :root to tweak accent hues for brand alignment.
- Maintain unique headings and narrative across all other pages to preserve content diversity.

License: Free to adapt for client work. Replace placeholder personal data before publishing.