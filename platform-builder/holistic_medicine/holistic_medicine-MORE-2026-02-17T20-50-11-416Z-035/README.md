# holistic_medicine-MORE-2026-02-17T20-50-11-416Z-035

Project seed: 3926355401

Layout family: earthy_warm
Voice family: mystic_modern
Offer model: intensive
Section pack used: hero, social_proof, benefits, process, faq, cta

Files in this chunk:
- contact.html
- README.md

Purpose
- contact.html is the contact + interactive utility page for the holistic_medicine site.

Placeholders to replace
- {{BUSINESS_NAME}} — business name/title
- {{TAGLINE}} — tagline placeholder (not shown on this page but used site-wide)
- {{PHONE}} — phone number
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — primary CTA button text
- {{PRIMARY_CTA_URL}} — link used in generated agenda (replace with booking path)
- {{CITY}}, {{STATE}} — location placeholders

Interactive features implemented (client-side only)
- Whole-person inventory: checkbox list where users select areas of focus. Clicking "Generate agenda" builds a suggested consultation agenda and a follow-up cadence. The agenda can be copied to clipboard.
- Guided exercise modal: a three-step micro-practice (breath, journaling, intention). Runs entirely in JS, saves brief responses to sessionStorage and advances between steps automatically.

Notes for developers
- The contact form is a demo. It simulates sending and resets on completion.
- The agenda builder maps checked areas to short descriptions and produces a suggested cadence. Adjust copy and timing heuristics as needed.
- No external assets are loaded. The design expects an SVG asset at assets/img/pattern.svg in other chunks if you add decorative backgrounds.

Accessibility and behavior
- Modal can be dismissed with the Close button, by clicking the backdrop, or pressing Escape.
- The guided breathing step uses a timed loop; it advances automatically when the short cycle completes.

Integration
- Ensure primary CTA URL replacement for the agenda's request link: replace {{PRIMARY_CTA_URL}} with the booking endpoint or page.
- Replace placeholders with actual data via your templating/build process or by string substitution.

Legal & content notes
- Tone avoids promises or cures. The page uses educational language and includes a brief privacy/safety note. Keep clinical disclaimers on pages that discuss conditions or treatments.

How to preview
- Serve the folder with a static HTTP server (for example, `python -m http.server` from the project root) and open contact.html in a browser.

Design decisions
- Navigation labels differ from default templates to provide a fresh site vocabulary.
- Interaction choices emphasize short, practical work: an actionable agenda and a short guided practice to demonstrate process and tone.

If you need the complementary assets (logo SVG, pattern, other pages), they are in different chunks of the full bundle. Replace placeholders and tune copy to fit your practice and regulatory needs.