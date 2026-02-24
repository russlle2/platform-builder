Contact page chunk for sound_bath site (slug: sound_bath-2026-02-16T14-53-53-146Z-050)

Files included in this chunk:
- contact.html : The contact / inquiry page with hero, plan, diagnostic (screening + flow), micro_habits, pricing summary, and CTA. Includes a contact form and inline SVG background for visual richness.

How to customize:
- Replace placeholders with your information: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{NEXT_EVENT_DATE}}.
- The contact form posts to /submit-inquiry by default; update action to your form endpoint or serverless function.

Design notes & constraints:
- Designed to be sensory + premium: dark gradients, translucent cards, and an embedded SVG pattern for subtle motion.
- No external fonts or CDNs are used; it relies on system fonts for performance and portability.
- The page intentionally varies section order and nav wording relative to other templates to meet uniqueness rules.

Accessibility & content reminders:
- The diagnostic section contains "what to bring", contraindications, and a clear session flow.
- For your events and private sessions pages, ensure instruments listed differ (this page lists: crystal bowls, gong overtones, chimes, monochord) to maintain variety across pages.

Developer tips:
- The SVG background is inline to avoid external assets. If you create assets/img/pattern.svg for reuse, you can replace the inline SVG with a background-image reference to that path.
- Adjust the grid in .container and .grid for layout changes; the aside is the compact contact column.

Offer model:
- This chunk references the VIP Day model in pricing text; adjust package descriptions and pricing details in pricing.html for full clarity.

If you need additional pages from this project (index, events, private-sessions, pricing, about, faq, book), request the next chunk and they will be produced with matching visual language and varied section structure.