Project: wellness_coach (slug: wellness_coach-2026-02-16T03-35-26-876Z-008)

This bundle contains the contact page and a README for the Wellness Coach site (layoutFamily: bold_playful, voiceFamily: scientist_guide, programModel: membership).

Files included in this chunk:
- contact.html  — Full contact & outreach page. Includes hero, myth_vs_truth, pillars, case_studies, faq, cta (contact form).
- README.md     — This document.

Placeholders used (replace these in your templating or text editor):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{COACH_NAME}}
- {{CREDENTIALS}}
- {{CITY}}
- {{STATE}}

Design notes / developer guidance:
- Visual style: bold_playful — lively CTAs, vivid accent (--accent), rounded cards and large radius values.
- No external fonts or assets are referenced. The template expects local SVGs at assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg (created in other chunks).
- Navigation links point to the other site pages: index.html, about.html, programs.html, services.html, pricing.html, testimonials.html, book.html, contact.html.
- Required sections (hero, myth_vs_truth, pillars, case_studies, faq, cta) are present on contact.html; content is written to emphasize outcomes, habit frameworks, and membership model.

Accessibility & behavior:
- Basic semantics: headings, nav, main, footer, form fields with labels.
- Simple JS toggles for FAQ and a lightweight form handler that alerts and resets the form. Replace the handler with real network submission or server endpoint for production.

Customization tips:
- Replace placeholder tokens with real values at build time or via a templating engine.
- Adjust color variables in the :root to align with brand colors.
- Add progressive enhancement for form submission (fetch to API, validation, honeypot for spam) on the server side.

Uniqueness & copy guidelines followed here:
- Language is evidence-focused and practical; no medical claims.
- The page uses distinct section headings and metaphors ("dismantle myths", "measurement-first routines", "Habit Hive membership") to ensure it is unique among site templates.

If you need additional pages, SVG assets, or variations (e.g., alternate nav labels, different program names), request the next chunk and note any desired copy or structural changes.