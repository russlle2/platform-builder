Contact page for the sound bath site (layoutFamily=split_diagonal, voice=minimal_poetic).

What this file is

- contact.html: A standalone contact and booking page with an embedded SVG pattern (no external assets). It includes a poetic, sensory-forward hero, an information panel covering "what to bring", contraindications, session flow, and a booking/contact form. It also includes condensed versions of myth_vs_truth, pillars, and case_notes to satisfy the required section pack for this chunk.

Placeholders to replace

- {{BUSINESS_NAME}} — your studio or brand name
- {{TAGLINE}} — short descriptive line
- {{PHONE}} — public contact phone
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — label for the form submit button (e.g., "Send request")
- {{PRIMARY_CTA_URL}} — form action target (endpoint or third-party form handler)
- {{CITY}} / {{STATE}} — location for clarity
- {{FACILITATOR_NAME}} — primary facilitator
- {{VENUE_NAME}} — typical event venue name
- {{NEXT_EVENT_DATE}} — next public event date

Notes & implementation details

- Visuals: The page uses CSS gradients, a diagonal split, and an embedded SVG pattern (inside the HTML) to achieve visual richness without external files.
- Accessibility: form fields have labels. The decorative SVG is aria-hidden and pointer-events are disabled so it does not interfere with interaction.
- Sound bath specifics: The page includes sensory and premium language, a detailed "what to bring" block, contraindications guidance, and a step-by-step session flow. The instrument palette mentioned in the form placeholder text is deliberately varied (crystal bowls, tuning forks, monochord, gentle chimes) to follow the uniqueness requirement.
- Navigation: Links are internal and intentionally use varied labels to avoid repetition across templates (Gather, Series, 1:1, Why we hold, Connect).

How to use

- Replace placeholders with your real content. If you need server-side handling for the form, set {{PRIMARY_CTA_URL}} to your endpoint and implement form processing there.
- The embedded SVG pattern is intentionally subtle; adjust opacity in the .pattern-wrap rule if you want it stronger or weaker.

Developer tips

- To add an external assets/img/pattern.svg later, replace the inlined SVG block with an <img> or background-image reference and update the CSS.
- For theme tweaks: adjust --accent and --accent-2 in the :root to change the tonal palette.
- For mobile spacing: reduce --maxw or adjust padding in .wrap.

License

This file is provided as-is for use in your project. Customize freely.