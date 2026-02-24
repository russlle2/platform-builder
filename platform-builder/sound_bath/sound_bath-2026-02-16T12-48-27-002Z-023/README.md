Contact page for the sound-bath site (chunk 4)

Overview:
- File: contact.html — a self-contained contact and information page styled with CSS and an inline SVG backdrop. It follows the "bold_playful" layout family while keeping copy in a "clinical_calm" voice.
- Purpose: Allow visitors to inquire, book, or get quick logistics (phone/email/location). The page also includes sensory guidance, contraindications, session flow, instruments list, and hybrid-offer notes.

Sections included (unique order and headings for this template):
- Header/navigation (labels vary slightly from other templates; "Gatherings" for events, "Private" for private sessions, "Connect" for contact).
- Hero: primary enticement and quick contact blocks.
- Contact form: posts to {{PRIMARY_CTA_URL}}; fields: name, email, topic, message.
- At-a-glance panel: what to bring, typical session flow, instruments, hybrid model details.
- Myth vs. truth: short debunking section.
- Case notes: facilitation observations and adaptive cues.
- FAQ: includes contraindications and pregnancy guidance.
- CTA: final call-to-action referencing {{NEXT_EVENT_DATE}}.

Placeholders to replace at build-time or via templating:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{FACILITATOR_NAME}}
- {{VENUE_NAME}}
- {{NEXT_EVENT_DATE}}

Accessibility & content notes:
- Form uses native inputs and labels; add server-side validation for required fields.
- Contraindications copy is conservative and non-diagnostic; keep legal/medical disclaimers consistent with local regulations.
- The page is intentionally self-contained (no external images or fonts). The SVG background is inline to avoid external assets. If you plan to generate a shared pattern file, place it at assets/img/pattern.svg and reference in other pages.

Design notes:
- Visual richness is achieved via gradients, layered translucent panels, and an inline SVG pattern. Adjust colors in the :root variables for branding.
- The page uses a glass-like card system to feel premium and tactile while maintaining a calm clinical tone in copy.

Integration instructions:
- Drop contact.html into the site root or appropriate route.
- Replace placeholders programmatically or with simple search-and-replace.
- Ensure server endpoint at {{PRIMARY_CTA_URL}} accepts POST from the contact form; otherwise change form action.
- For email links, keep the mailto: fallback for quick contact.

Notes for other chunks:
- Keep instrument lists varied across pages: this contact page uses crystal singing bowls, gong, tuning forks, monochord, and koshi chimes.
- Navigation labels intentionally differ from index/events templates to satisfy uniqueness rules.

Versioning/seed metadata:
- Slug: sound_bath-2026-02-16T12-48-27-002Z-023
- Seed: 2061424504
- Layout family: bold_playful
- Voice family: clinical_calm
- Offer model: hybrid

End of README.