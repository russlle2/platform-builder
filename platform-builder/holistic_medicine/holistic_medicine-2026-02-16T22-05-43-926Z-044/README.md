# Contact page — holistic_medicine (chunk 4)

This bundle contains two files for the contact page of the holistic / integrative medicine site.

Files included:
- contact.html — Full contact page built around a split-diagonal layout, inline SVG pattern, event-series emphasis, and the required sections (hero, diagnostic cues, plan, micro-habits, pricing teaser, CTA).

Placeholders to replace in contact.html:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Notes & guidance:
- Visuals: the page uses inline SVG (pattern) and CSS gradients to keep the page self-contained — no external images, fonts, or CDNs.
- Layout: "split_diagonal" is expressed by a clipped left panel with an overlaid subtle SVG pattern.
- Voice: minimal_poetic — short evocative lines and calm language; avoids medical guarantees and emphasizes education and whole-person care.
- Offer model: events_series — the page references monthly circles, workshops, and short consults.
- Disclaimers: included near contact and footer; there are no promises of cures.

Customization:
- Replace placeholders with site data. The contact form posts to {{PRIMARY_CTA_URL}}; update to your form handler or mail service.
- If you prefer the SVG pattern as a separate file, extract the <svg> from contact.html and save it to assets/img/pattern.svg; then reference it in CSS as a background-image.

Accessibility & legal:
- The form uses simple semantic inputs. Ensure server-side validation and spam protection before deployment.
- Keep the medical disclaimer visible and accurate for your jurisdiction.

Slug: holistic_medicine-2026-02-16T22-05-43-926Z-044
Seed: 3707477635
Layout: split_diagonal
Voice: minimal_poetic
Offer model: events_series

