# Contact Page & Usage

This bundle contains two files for chunk 4 of the wellness coach site: contact.html and README.md.

Files included:
- contact.html — full contact page, cohort & diagnostic focused, includes inline SVG artwork and compact previews of the required sections: hero, diagnostic, plan, micro_habits, pricing, and CTA (these elements are presented as mini-previews so they "ripple" from the index to other pages).
- README.md — this document.

Placeholders used (replace these in your build process or templating engine):
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

Design notes:
- Layout family: bold_playful — the contact page uses bold geometry, accent highlights, and lively CTAs.
- Voice family: spiritual_teacher — language is gentle, reflective, and oriented to outcomes + habit frameworks.
- Program model: cohort — references to cohorts, enrollment windows, and small-group rhythm are explicit.

SVGs and assets:
- To keep this chunk self-contained, the contact.html includes inline SVG artwork (avatar/visuals). If you prefer separate asset files, extract the inline SVG elements and save them as:
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg
  Ensure each extracted SVG remains unique (do not copy/paste identical art across templates).

Form behavior:
- The contact form has a mailto action for quick testing. Replace with your form endpoint or serverless function for production.

Content & compliance:
- Copy focuses on habits, frameworks, and cohorts — it avoids medical claims.
- Includes a lead magnet mention (7-day Micro-Habit Reset) and clarifies coaching scope.

Navigation hints:
- Nav labels intentionally vary across templates (Home, About, Paths, Invest, Stories, Book, Reach Out) — keep each page's headings and labels unique to satisfy the uniqueness rules.

Next steps:
- Replace placeholders with real values or wire into your templating system.
- Optionally extract inline SVGs into assets/img/ and update references.
- Hook the contact form to your mail handler or CRM.

If you need the remaining pages generated (index, about, services, programs, pricing, testimonials, book), request the next chunk and specify any adjustments to tone, colors, or structure.