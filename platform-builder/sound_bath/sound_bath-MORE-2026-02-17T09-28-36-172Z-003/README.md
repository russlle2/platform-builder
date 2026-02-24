Contact page for the sound bath website (chunk 4).

Purpose:
- This file is the contact / connect page for the series-driven sound events site.
- Contains a contact form, pricing snapshot widget, and a Mood-to-Method micro-interaction.

Files included in this bundle:
- contact.html — full self-contained page with inline SVG pattern, CSS and JS.

Key features implemented on contact.html:
- Navigation with a distinct label set linking to the canonical pages: Gatherings, Private Sessions, Invest, Our Story, Reserve, Connect.
- Decorative SVG pattern embedded inline (assets are not external).
- Contact form with placeholders and action to mailto:{{EMAIL}}; includes name, phone, reason, and message fields.
- Contraindications disclaimer (responsible guidance for users with relevant medical issues).
- Pricing Comparator toggle (Monthly vs Package):
  - Toggle switch updates displayed prices for three program tiers (Wave, Tide, Stillpoint).
  - Animated number transitions use requestAnimationFrame for smooth easing.
- Mood-to-Method selector:
  - User selects a current state (e.g., Anxious, Tired, Sad).
  - The recommended approach card morphs (title, description) and CTA text updates.
  - CTA navigates to the placeholder {{PRIMARY_CTA_URL}} when clicked.

Placeholders present (must be replaced server-side or by templating):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for integration:
- This chunk intentionally avoids external fonts and assets. The visual pattern is inlined in the page and is unique to this template.
- If you need a separate assets/img/pattern.svg file in your build, extract the <svg> block from contact.html and save as that path, then update CSS to reference it.
- The pricing numbers are provided via data attributes (data-monthly, data-package) to make it easy to inject server-side values.
- The form uses mailto: by default. Replace the form action and method with your preferred server endpoint if you want programmatic handling.

Accessibility & behavior:
- The pricing switch is keyboard interactive (Enter/Space supported) and toggles aria-pressed.
- The page uses clear visual contrast and offers textual fallback for the CTA buttons.

Developer tips:
- To add more moods or change copy, edit the mapping object in the Mood-to-Method script near the top of the JS block.
- To change or localize prices, adjust the data-monthly and data-package attributes on each .price element.

Design decisions (practical guide voice):
- The page favors clarity over ornament: clear affordances, gentle animations, and direct CTAs.
- Program names (Wave, Tide, Stillpoint) present a distinct framing for offerings compared to other templates.

Slug / meta used for generation:
- sound_bath-MORE-2026-02-17T09-28-36-172Z-003
- seed: 2562314838
- layoutFamily: poster_hero

If you need the accompanying pages (index, events, private-sessions, pricing, about, faq, book) generated next, request the next chunk and supply any content overrides for branding and pricing.