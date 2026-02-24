This bundle contains the contact page and a simple README for the sound-bath site chunk.

Files included:
- contact.html — Interactive contact page that includes:
  - Mood-to-Method selector: choose current mood to morph recommendations.
  - Sound preference mixer: gentle / medium / intense intensity selector that updates the recommendation and CTA in real time.
  - Contact form that captures the current mood and intensity (local-only; simulated send).
  - Contraindications section with responsible safety notes.
  - Local navigation that maps to the site pages: index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html, contact.html.

Placeholders to replace before production:
- {{BUSINESS_NAME}} — your studio or brand name
- {{TAGLINE}} — if desired elsewhere
- {{PHONE}} — phone link target
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — primary call-to-action label used as base
- {{PRIMARY_CTA_URL}} — base URL used for the dynamic CTA
- {{CITY}} and {{STATE}} — in-studio location text

How it works and how to customize:
- The Mood selector uses data-mood attributes. The intensity selector uses data-intensity.
- The mapping of mood + intensity to title, description, and CTA text is in the contact.html script under the "library" object. Edit copy there to change recommendations.
- The dynamic CTA navigates to {{PRIMARY_CTA_URL}} and appends mood and intensity as URL query parameters. Replace {{PRIMARY_CTA_URL}} with the booking page or scheduler you use.
- Contact form is intentionally client-side only. Hook up a real endpoint by replacing the form submission handler in the script with a POST to your backend or a third-party form service.

Assets:
- The page references an SVG pattern at /assets/img/pattern.svg. Provide a unique SVG there for the visual texture.

Accessibility and notes:
- Buttons offer aria-pressed toggles and a small keyboard arrow navigation helper.
- Contraindications are included for safety; adapt them to your legal counsel and local practices.

Local testing:
- Place this file alongside the other pages for the full site.
- Open contact.html in a browser. Interact with the mood and intensity controls and try the booking CTA.

License and origin:
- Generated for the sound_bath site slug: sound_bath-MORE-2026-02-17T10-19-53-016Z-015, layoutFamily=clinic_modern, voiceFamily=mystic_modern.

If you need additional pages or updates to the tone and copy, request the next chunk with the pages you want edited.