Project: wellness_coach (lux_gallery, spiritual_teacher voice)
Slug: wellness_coach-2026-02-16T04-35-59-887Z-026
Seed: 2703849444

Overview
This repository is a premium, gallery-style website template for a wellness coach who runs cohort-based programs. The layoutFamily is lux_gallery — expect large illustrative SVGs, restrained motion, and a refined palette. The voice is warm and spiritual but practical; programModel is cohort-focused.

Files included in this chunk
- contact.html — Contact and cohort-entry hub. Contains hero, diagnostic teaser, cohort plan, micro-habit sampler, pricing teaser, contact form and strong CTA. Designed to "ripple" core sections from the index so visitors can access essential funnels from any page.
- README.md — This file.

Site pages (full site)
The full project uses these pages. Each page is unique in headings, nav labels, and metaphors to keep variety across templates:
- index.html (hero, diagnostic, plan, micro_habits, pricing, cta) — primary intake hub
- about.html
- services.html
- programs.html (label variations: Paths / Programs / Work With Me across templates)
- pricing.html (sometimes framed as Invest)
- testimonials.html (Stories)
- book.html (Book a Seat)
- contact.html (this file)

Design notes
- Lux_gallery: large SVGs and cards. Keep whitespace, elegant typography scale, and subtle glass cards.
- Avoid third-party fonts or CDNs. All assets are local.
- Required section pack (hero, diagnostic, plan, micro_habits, pricing, cta) must appear on the index and should be visible or linked from other pages as teasers. contact.html includes each as a condensed block.

Placeholders
Replace these placeholders across templates when you customize the site:
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

Assets
This project references local SVGs (create unique files in assets/img/):
- assets/img/hero.svg — main hero illustration for gallery layout
- assets/img/avatar.svg — coach avatar or portrait graphic
- assets/img/pattern.svg — decorative pattern used in backgrounds

Accessibility & Forms
- The contact form in contact.html is a demo (onsubmit uses an alert). Integrate a backend endpoint or form provider and update the form action.
- Buttons and links use clear labels and should be keyboard accessible.

Content & Tone
- Voice: spiritual_teacher — evocative, present, practice-oriented without medical claims.
- Focus on outcomes, frameworks, and habits. Include a lead magnet (Free Rhythm Diagnostic) and clear cohort enrollment CTAs.
- Pricing should be framed as investment tiers (Seed Circle, Seasonal Cohort, Guided Residency) with options for early-bird and payment plans.

Developer notes
- Vary headings and nav labels across templates to meet uniqueness requirements.
- Ensure anchor links to index sections (e.g., index.html#diagnostic) exist and are consistent.
- Create unique SVG artwork for each of the three asset files — do not reuse identical SVGs across templates.

How to customize
1. Replace placeholders in HTML files with real values or a templating engine.
2. Add real SVGs to assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg.
3. Implement a real form backend and remove the demo onsubmit handler.
4. Audit each page to ensure the required section pack is discoverable from index and other pages.

Contact
For design rationale or to request variations (colors, type scale, layout shifts within lux_gallery), update the README with desired changes or open an issue in your project tracker.

Thank you for using this template. May the cohorts you hold be fertile and steady.