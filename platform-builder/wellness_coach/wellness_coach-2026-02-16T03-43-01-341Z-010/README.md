This chunk contains the contact page and documentation for the wellness coach site (layout: earthy_warm, voice: executive_coach, model: intensive).

Files included in this bundle:
- contact.html — a premium, warm contact page with hero, values, methods, objections, testimonials, lead magnet, and contact form. It is intentionally designed to "ripple" the required sections from the index across secondary pages so visitors can access core messaging from multiple pages.

Placeholders used (replace these with real values):
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
- Layout family: earthy_warm — warm tones, soft rounded cards, friendly spacing.
- Voice: executive_coach — energetic, outcome-focused, no medical claims.
- Program model: intensive — language emphasizes focused cycles and measurable checkpoints.

Structure and how sections are represented here:
- Hero: top section with strong headline, compact contact card, and CTA.
- Values: "Core Commitments" block — short list of three guiding principles.
- Methods: "Signature Methods" — three concise framework descriptions.
- Objections: "Common Concerns" — two explicit objections with direct answers.
- Testimonials: short social proof block with two client quotes.
- Lead magnet: "7-Day Habit Reset" opt-in with an email capture (simulated submission).
- CTA: prominent primary button and booking link (uses {{PRIMARY_CTA_URL}} and {{PRIMARY_CTA_LABEL}}).

Form handling:
- The contact form and lead magnet form are intentionally client-side only in this static bundle. Replace the simulated submit handlers with your preferred form endpoint or serverless function.

Assets:
- The page references local SVGs expected in assets/img/ — update or replace these assets as needed:
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg

Accessibility & considerations:
- Semantic headings and aria labels are used for the hero and key regions.
- All CTAs and contact methods use placeholders that should be filled with real URLs and contact info.

Customization checklist before publishing:
- Replace placeholders with real content.
- Hook the contact form to your inbox, CRM, or scheduling tool (e.g., Calendly, Acuity, or a custom API).
- Add or swap local SVGs for brand-consistent visuals.
- Confirm privacy text and response times match your policies.

Notes on uniqueness and site consistency:
- Navigation labels are chosen to remain slightly different across pages (e.g., "Paths" here for Programs) to meet project requirements for varied labels.
- Headings and section names are deliberately different from other templates to avoid repetition across the full site.

If you need the complementary pages (index, about, services, programs, pricing, testimonials, book) or the SVGs recreated, request the next chunk and I will generate them with consistent design language and varied copy per the project rules.