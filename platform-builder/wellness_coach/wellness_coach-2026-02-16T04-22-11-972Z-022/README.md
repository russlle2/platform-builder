# Chunk 4 — contact.html + README

This chunk contains the contact page (contact.html) and this README for the wellness coach site.

Purpose
- contact.html is a clinic_modern–styled, premium contact + conversion page for a wellness coach working with cohort programs.
- It intentionally ripples the required sections from the site-level pack so the important bits (hero, diagnostic, plan, micro_habits, pricing, cta) are discoverable from the contact page.

Key features
- Hero: "Reach out — let’s co-create your next 6-week shift" sets expectations and highlights the lead magnet.
- Diagnostic: a quick 3-question check the user can answer to speed onboarding.
- Plan: a concise 6-week outline geared toward cohort-style learning.
- Micro-habits: actionable starter habits to reduce friction for visitors.
- Pricing: a transparent teaser of three tiers with links to the pricing page.
- CTA: big, clear actions to book a clarity call or join a cohort.
- Contact form: collects name, email, city, interest and a short message. The form action currently posts to /thank-you (adjust as needed).

Placeholders
Use the following placeholders that are present in the page source to inject live data in your build process:
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

Design notes
- layoutFamily: clinic_modern — crisp grid, clinical calm, precise components, muted color palette with a teal accent.
- voiceFamily: spiritual_teacher — language balances soulful phrasing with pragmatic habit-based guidance.
- programModel: cohort — copy references cohorts, limited seats, and a cohort-based curriculum.

Integration tips
- Ensure the other pages (index.html, about.html, programs.html, services.html, pricing.html, testimonials.html, book.html) exist and the nav links match paths.
- Assets referenced (assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg) should be placed in the assets/img folder in the site root. Those SVGs must be unique and created locally (not external).
- Replace placeholder tokens with real values server-side or during build.

Accessibility & performance
- The layout uses semantic sections and explicit ARIA labeling for form and sections.
- No external scripts or fonts are loaded; the CSS is embedded for a single-file, fast baseline.

Local testing
- Open contact.html in a browser for a visual check.
- For form testing, either point the form to a working endpoint or intercept submit with a small script during local dev.

Chunk scope
- This chunk intentionally focuses on the contact page; other pages and the SVG assets are expected to be provided in other chunks of the site generation.

If you want, I can now generate the matching SVG assets and the remaining pages, with unique headings and varied nav labels across templates to satisfy uniqueness constraints.