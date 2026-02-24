# Contact page — {{BUSINESS_NAME}}

This directory contains the contact page for the sound bath site. It follows the "earthy_warm" design language and a minimal, poetic voice.

Files
- contact.html — the full contact/booking page. Includes:
  - Hero and quick details about sessions
  - What to bring, session flow, and contraindications
  - Contact card with venue, phone, email, and facilitator
  - Contact form (falls back to mailto: for ease of use)
  - Decorative inline SVG pattern and warm gradient palette

Placeholders to replace
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

Notes for customization
- The form submission currently opens the user's mail client via a mailto: link to {{EMAIL}}. Replace the form handler or add an API endpoint if you prefer server-side handling.
- The page embeds an SVG pattern directly in the DOM for visual richness. If you centralize SVG assets, you may move it to assets/img/pattern.svg and reference it with CSS.
- Keep the contraindications text visible and unambiguous — it's important for participant safety.
- To adapt for accessibility: ensure contrast ratios after color tweaks and add aria labels where desired.

Design cues
- Earthy palette uses terracotta, sand, deep espresso, and a muted green accent.
- Layout is responsive; two-column on larger screens, stacked on small viewports.

If you need additional pages or alternate instrument lists (e.g. crystal bowls vs. tuning forks), implement those on events.html or private-sessions.html to maintain variety across the site.