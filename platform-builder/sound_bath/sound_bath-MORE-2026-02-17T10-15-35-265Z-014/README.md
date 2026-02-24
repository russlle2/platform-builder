Contact page — bundle chunk 4

Files included:
- contact.html : Interactive contact & matching page with Mood-to-Method and Sound Preference Mixer.

Placeholders used (must be left for runtime interpolation):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used on this page but available site-wide)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Interactive features implemented (local JS):
- Mood-to-Method selector: pick a mood (frayed, foggy, wired, curious). The control updates the recommended approach text dynamically.
- Sound Preference Mixer: choose gentle / medium / intense. When combined with mood selection, the recommendation, CTA label, and CTA URL (query parameters appended) update.
- CTA behavior: primary CTA text and href mutate to reflect the combined choice; initial text/href fall back to placeholders.
- Small keyboard helpers: keys 1-4 select moods, q/w/e select preferences.

Other notes:
- A patterned SVG is referenced at assets/img/pattern.svg for visual texture; the asset should be present elsewhere in the site build.
- Navigation uses an intentionally varied label set but points to the canonical pages (index.html, events.html, private-sessions.html, pricing.html, about.html, book.html, contact.html).
- Contraindications disclaimer included; developers should review and adapt legal copy with clinical counsel if necessary.

Developer instructions:
- Drop this file into the site root alongside other pages.
- Ensure assets/img/pattern.svg exists.
- Replace placeholders server-side or during templating.
- The contact form currently uses a mailto action for simplicity; hook to your form handler if you prefer server posting.

Design notes:
- Tone: warm_storyteller with bold_playful layout influences.
- This page intentionally offers a unique framing of programs (names like Cocoon Ease, Clarity Loom, Root Release) and distinct CTA phrasing from other site templates.

End of chunk 4 README.