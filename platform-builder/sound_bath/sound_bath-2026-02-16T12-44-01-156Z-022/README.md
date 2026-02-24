Contact page and integration notes for the sound_bath site (chunk 4).

Files included in this bundle:
- contact.html — The contact & booking page for {{BUSINESS_NAME}}. Designed with a sensory, premium aesthetic and clinical-minded content.

Purpose and highlights:
- Provides a client-facing contact form for inquiries and bookings.
- Includes clinical disclaimers and a clear contraindications prompt (pregnancy, implants, recent surgery, epilepsy, etc.).
- Describes session flow (arrival, grounding, sound journey, integration).
- Lists "what to bring" items and a curated instrument selection (monochord, crystal bowls, Koshi chimes, tuning forks).
- Uses a repeating SVG pattern referenced at assets/img/pattern.svg for visual richness (replace this file to change background motif).
- Navigation labels are intentionally varied to remain unique across pages.

Placeholders to replace before publishing:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used directly here but present site-wide)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{FACILITATOR_NAME}}
- {{VENUE_NAME}}
- {{NEXT_EVENT_DATE}}

Form integration:
- The form currently posts to the placeholder action: {{PRIMARY_CTA_URL}}. Replace with your form endpoint, a serverless function URL, or a mailing service integration.
- Ensure server handling sanitizes inputs and honors GDPR/CCPA rules where applicable.

Accessibility & performance notes:
- All interactive elements are standard HTML controls for keyboard accessibility.
- No external fonts or CDN dependencies — adjust styles and add local webfonts if desired.

Visual assets:
- The page references assets/img/pattern.svg for the repeating background. Provide a bespoke SVG there to keep brand uniqueness.

Editing tips:
- Keep the clinical/clinic_modern balance by leaving the contraindications and "what to bring" sections intact.
- To adjust instrument palette, edit the short list in the contact card; maintain variety across pages to meet uniqueness requirements.

Seed & slug for this build:
- Seed: 4194120174
- Slug: sound_bath-2026-02-16T12-44-01-156Z-022

If you need the complementary pattern SVG or additional pages from this site bundle, request the next chunk containing assets/img/pattern.svg and the remaining HTML pages.