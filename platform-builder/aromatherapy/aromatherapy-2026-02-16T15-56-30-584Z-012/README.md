# Chunk 4 — contact.html + README

This bundle contains two files for the aromatherapy site (lux_gallery layout family):

- contact.html — A richly styled contact page optimized for a practitioner offering VIP Day services. It includes:
  - Header with subtle brand block and navigation (labels varied: Home, Offerings, Blends, Shop, Book a Day, Connect).
  - Hero with contact details and clear safety-forward copy (no medical claims).
  - Social proof (client quotes).
  - Benefits, Process, and an FAQ section covering dilution, patch testing, pet safety, and pregnancy guidance.
  - Lead magnet capture (free guide) with a simple front-end handler.
  - Prominent CTA to book the VIP Day using placeholders: {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}.
  - All contact placeholders left as tokens: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{FAVORITE_BLEND}}.

- README.md — This file (you are reading it) describing the chunk.

Notes and integration:
- The page references a visual pattern; an assets/img/pattern.svg is expected elsewhere in the project to maintain a consistent gallery aesthetic. The contact page also includes an inline SVG layer for independent visual depth.
- The copy is safety-focused and avoids medical claims. The FAQ provides practical, non-medical guidance.
- To wire up real form handling or analytics, replace the lead form stub in contact.html with your endpoint.

Usage:
- Drop contact.html into the site root along with the other pages in this project.
- Replace placeholder tokens with real values during templating or build.
- No external fonts or CDN resources are used.

Accessibility & responsive behavior:
- The layout adapts from two-column to single-column under 900px.
- Color contrast and clear affordances prioritized for quick scanning.

Design decisions (practical_guide voice):
- Clean, professional microcopy for clients who want clear processes and safety-forward aromatherapy.
- VIP Day is presented as a practical, one-day offer to accelerate results rather than a vague promise.

If you need alternate nav labels, a different CTA layout, or an embedded map tile, request a follow-up and specify the desired behavior or service provider for mapping.