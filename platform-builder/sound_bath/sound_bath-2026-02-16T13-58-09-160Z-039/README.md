Contact page chunk for sound_bath project (slug: sound_bath-2026-02-16T13-58-09-160Z-039; seed: 2109290360)

Files in this chunk:
- contact.html — full contact / connective page designed for a premium sensory sound bath offering. Contains the required sections: hero, diagnostic, plan, micro_habits, pricing, cta.

Design notes and behavior:
- Layout family: bold_playful. Visual richness is delivered through CSS gradients, an inline SVG pattern, and layered panels — no external images or fonts used.
- Voice family: practical_guide. Copy aims to be direct and service-oriented.
- Offer model: vip_day emphasized in hero and plan sections.
- The page includes the required sound-bath specifics: "what to bring", contraindications, and a clear session flow. Instrument palette is varied and intentionally different from other templates (crystal bowls, tuning forks, chimes, monochord, gong references).
- Navigation labels are intentionally varied (Gather, Gatherings, Intimates, Investment, Our Practice, Questions, Reserve, Connect) but link to the canonical filenames.
- Contact form is a simple mailto form for easy integration; change the form action to a server endpoint if you need backend handling.

Placeholders to replace in integration:
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

Accessibility & integration tips:
- The decorative SVG is inline, low-contrast, and marked aria-hidden. Adjust opacity or remove for high contrast needs.
- To collect form submissions server-side, replace the mailto form action with a POST endpoint and include CSRF protections as needed.
- For analytics, tie the CTA buttons (tel:, mailto:, PRIMARY_CTA_URL) to event tracking.

Customization ideas:
- Swap color variables in :root to align with brand palette.
- Replace the inline SVG with an external assets/img/pattern.svg if you prefer centralized assets (ensure the filename matches other pages).
- Expand the diagnostic to a short interactive quiz with JavaScript for richer lead qualification.

This chunk intentionally focuses on sensory language and premium cues while remaining functional for bookings and enquiries.