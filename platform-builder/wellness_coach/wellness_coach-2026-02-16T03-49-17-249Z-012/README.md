# wellness_coach-2026-02-16T03-49-17-249Z-012 — Contact page

This bundle chunk includes two files:

- contact.html — A full contact and site-ripple page for the wellness coaching site built with the "lux_gallery" layout family. Contains inline SVG artwork used in the gallery hero, avatar, and pattern. The page includes the required section pack (hero, values, methods, objections, testimonials, lead_magnet, cta) so the site navigation and ripple are explicit from the contact page.

- README.md — This file.

Placeholders
- The HTML uses templated placeholders that must be replaced by your build system or templating engine:
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

Integration notes
- No external fonts or assets are referenced. SVG art is included inline in contact.html so no external asset files are required for this chunk.
- The contact form actions point to {{PRIMARY_CTA_URL}} by default. Replace with your server endpoint or third-party form handler, or change to a mailto:{{EMAIL}} link for simple setups.
- Navigation links reference other pages in this project (index.html, about.html, programs.html, pricing.html, testimonials.html, book.html). Ensure those pages are generated in other chunks of the full site.

Accessibility & behavior
- Semantic headings, landmarks (main/aside), and form labels (placeholders) are used. For production, consider adding explicit <label> elements and server-side validation.

Design & content guidance
- This page is written in an "executive coach" voice: clear, outcome-focused, and professional.
- It intentionally includes micro-copy for objections and a lead magnet sign-up to support conversion.
- The layout is gallery-like, with a large hero region and image-led card at the right.

Developer notes
- The file uses CSS variables at the top for easy branding adjustments (accent colors, radius, max width).
- The inline SVGs in contact.html act as the unique local images (hero, avatar, pattern). If you prefer separate files, extract the <svg> markup into the following paths and update the HTML accordingly:
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg

- Keep the identifiers and anchors intact if you need ripple-linking between pages (e.g., index.html#hero, about.html#values, programs.html#methods).

If you need alternate versions (light theme, different program framing, or an accessible-only HTML), tell me which variant to generate next.