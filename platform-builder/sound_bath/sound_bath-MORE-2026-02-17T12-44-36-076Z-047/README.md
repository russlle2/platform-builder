Contact page and usage notes for the sound bath site (chunk 4).

Files included in this bundle:
- contact.html — a complete, interactive contact page for {{BUSINESS_NAME}}.

Features implemented:
- Sound preference mixer (Gentle / Balanced / Deep) — local JS swaps recommended cohort programs dynamically.
- Proof Gallery — rotating testimonials with credibility badges and tooltips; auto-rotates and includes manual prev/next controls.
- Contact form — collects name, email, phone, interest and message; on submit it opens a mailto: to {{EMAIL}} as a local fallback (mock submit for static demo).
- Contraindications & accessibility notice — responsibly included.
- Cohort pricing language — describes cohort-cycle model rather than per-class tickets.
- Distinct navigation labels: Gatherings, Intimate Sessions, Rates, Story, Answers, Reserve, Connect.

Notes for integration:
- Replace placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- This chunk is intentionally a standalone page. It uses an inline SVG data URI for the subtle background pattern — no external assets are required.
- If you wire the contact form to a backend, replace the submitForm() mailto redirect with a fetch() to your endpoint and handle success/error flows.

Accessibility & safety:
- The page includes a clear contraindications disclaimer. Make sure to maintain that text where applicable.

Developer hints:
- CSS variables at top of the file can be adjusted for brand color changes.
- Mixer recommendations and proof testimonials are plain arrays inside the script and can be extended easily.

License: this is a project skeleton for {{BUSINESS_NAME}}'s site. Copy and adapt as needed.