This chunk contains the contact page and integration notes for the sound-bath project.

Files included:
- contact.html — full contact / info page styled for the "earthy_warm" layout family. Contains:
  - Header with subtle nav labels (varied from other templates).
  - Hero and warm storytelling voice sections.
  - Inquiry form (client-side stub), membership checkbox, preferred contact.
  - Detailed session flow (arrival, opening, immersion, closing), instruments list, what to bring, and contraindications disclaimer.
  - Contact details and placeholders for {{PHONE}}, {{EMAIL}}, {{VENUE_NAME}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{NEXT_EVENT_DATE}}.
  - Footer CTA using {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}.

Placeholders used (do not replace in codebase until you have real values):
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

Design notes:
- Palette follows an "earthy_warm" scheme via CSS variables. Keep modifications within :root to maintain consistent look.
- Visual richness is created via gradients, rounded cards, soft shadows, and an external SVG pattern referenced at assets/img/pattern.svg. Ensure that file is added to the assets in another chunk — the page expects that path.
- No external fonts or CDNs are used; system fonts only.

Accessibility & behavior:
- Form includes labels and a basic client-side submit handler (no network requests). Replace the handler with a real POST endpoint as needed.
- Map is a styled placeholder div; replace with an accessible embed or server-side map if required.

Integration tips:
- This page intentionally varies navigation labels from other pages (e.g., "Gather", "Upcoming", "1:1 & Spaces", "Investment", "Our Story", "Reach Out"). Keep link targets consistent with other templates: index.html, events.html, private-sessions.html, pricing.html, about.html, contact.html, book.html.
- The page mentions membership and private offerings to reflect the "membership" offerModel.
- Keep the contraindications text intact; it is required by the sound bath rules.

Developer checklist before publishing:
- Add assets/img/pattern.svg (unique SVG pattern for background) so the background overlay renders correctly.
- Wire the form to your backend or a form service and handle validation and privacy requirements.
- Replace placeholders with live business details.
- Test responsive behavior and keyboard navigation.

Voice & Copy:
- Warm storyteller tone; sensory and premium language used across descriptions. Avoid duplicating exact phrasing in other templates to maintain uniqueness.

If you need a different variation (shorter contact form, SMS callback, or multi-locale copy), request an adjusted version and specify which placeholder values to seed.