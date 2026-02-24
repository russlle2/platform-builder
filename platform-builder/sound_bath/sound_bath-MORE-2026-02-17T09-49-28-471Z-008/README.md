Project: sound_bath
Slug: sound_bath-MORE-2026-02-17T09-49-28-471Z-008
Seed: 3927492638
Layout family: poster_hero
Voice: practical_guide
Offer model: events_series
Section pack included for site: hero,myth_vs_truth,pillars,case_notes,faq,cta

Chunk: 4 — files included in this bundle:
- contact.html
- README.md

Purpose:
This chunk provides the contact page for the sound bath events site. It includes interactive features so the contact page can function as both an inquiry form and a small decision tool for visitors.

Key interactive features implemented locally (no external libs):
- Mood-to-Method selector: pick a mood and the recommended approach, short description, and the primary CTA label update dynamically. The CTA text is updated to reflect the recommendation while preserving the site PRIMARY_CTA_LABEL placeholder.
- Pricing Comparator (micro): a monthly vs package toggle that animates price numbers for three line items (Essential Circle, Focused Lab, Private Session). Values change with a smooth numeric animation.

Accessibility and UX notes:
- All interactive controls are buttons (not links) to ensure keyboard accessibility.
- Form is a mock: submitting clears the form and shows a brief transient CTA message. Replace with real endpoint as needed.
- Contraindications disclaimer is included near the form to responsibly highlight safety considerations (epilepsy, implants, pregnancy, psychiatric conditions).

Placeholders used in templates (replace at build/run time):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not printed on this page but used site-wide)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}} (not used on this page, keep for other pages)
- {{CITY}}
- {{STATE}}

Navigation labels differ from common sets to meet uniqueness requirements. All links point to the canonical files for the site:
- index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html, contact.html

Notes for integrators:
- No external assets, fonts, or CDN usage. The design relies on CSS and inline SVG/text.
- A unique SVG pattern file (assets/img/pattern.svg) is expected elsewhere in the project; this chunk does not contain it.
- The Events page (events.html) must implement the next-event module + calendar list (not part of this chunk).

How to test locally:
- Drop contact.html in a static server (or open directly) and replace placeholders with your values.
- Interact with the mood selector and pricing toggle to see the animations.

Contact:
For questions about the template structure or to request additional components, update the README or reach out to the site maintainer.
