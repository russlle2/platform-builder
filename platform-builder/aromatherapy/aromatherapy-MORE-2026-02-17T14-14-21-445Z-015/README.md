Contact page and integration notes for aromatherapy-MORE-2026-02-17T14-14-21-445Z-015

This chunk contains two files:

- contact.html — the contact/intent page with micro-interactions
- README.md — this file (instructions and notes)

Purpose

- contact.html provides a reachable intake form, a compact educational scaffold (myth vs truth), a short case-notes blurb, an FAQ focused on safety, and two interactive widgets:
  1) Pricing Comparator: toggles between 'Per-session' and 'Package' prices with animated numbers.
  2) Mood-to-Method selector: pick a current state and the page morphs the recommended approach and updates the CTA text and form hidden field.

Placeholders used (do not replace in templates engine unless desired):

- {{BUSINESS_NAME}}
- {{TAGLINE}} (available for reuse; not used verbatim in this file)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes on structure and intent

- Navigation uses an alternate label set (Sanctum, Journeys, Potions, Apothecary, Plans, Origin, Reserve, Reach) but links to the canonical pages (index.html, services.html, etc.).
- Copy avoids recent signature phrases and emphasizes safety-forward language: uses "may support" and practical guidance.
- Unique program naming: Pulse Session, Ritual Arc, Intensive Weave. Pricing wording intentionally different from prior templates.
- CTA phrasing varies per mood; each mood button updates the CTA label and sets a hidden form field 'mood'. The CTA also appends a query param to PRIMARY_CTA_URL for tracking (e.g. ?mood=clarity).

Daring features implementation

- Pricing Comparator:
  - Toggle implemented with two buttons (data-mode='monthly' / 'package').
  - Price nodes carry data-monthly and data-package attributes. JavaScript animates numeric changes with requestAnimationFrame.

- Mood-to-Method selector:
  - Buttons carry data-mood values. Selecting a mood updates a small method card (emoji, title, description) and the CTA.
  - The selected mood is written to a hidden field named 'mood' in the contact form so intake submissions include that context.

Accessibility and UX

- Buttons are keyboard accessible; pricing toggle listens for ArrowLeft/Right to move focus between options.
- Live region (aria-live='polite') is used on the method card for screen-reader awareness of changes.

Safety and FAQ

- FAQ entries include guidance for dilution, patch testing, pets, and pregnancy/nursing. Language deliberately avoids medical claims and emphasizes that aromatherapy may support wellbeing, not replace medical care.

Assets

- This chunk does not include external assets. The global project expects an SVG pattern at 'assets/img/pattern.svg' — add a unique SVG there (not provided in this chunk) if you want a separate asset reference.

Integration tips

- Replace placeholders server-side or with your static-site templating step.
- PRIMARY_CTA_URL should point to your booking endpoint or server-side handler that accepts form submissions. The contact form posts to PRIMARY_CTA_URL by default.
- If you need to capture the mood on the server, confirm the 'mood' hidden field is preserved by your handler.

Customization

- To change price tiers, edit the data-monthly / data-package values on the .price elements.
- To add more moods, extend the 'moods' object in the inline script and add a matching button with the data-mood attribute.

Notes for developers

- No external fonts or CDNs are used. Styling is self-contained with CSS variables for quick theme adjustments.
- Keep the safety-first framing in copy when editing: maintain "may support" phrasing and include dilution/patch-test/pet/pregnancy notes in public-facing text.

If you need the complementary assets (pattern SVG, global CSS partials, or server endpoints) included in a later chunk, request them and indicate preferred art direction for the pattern.