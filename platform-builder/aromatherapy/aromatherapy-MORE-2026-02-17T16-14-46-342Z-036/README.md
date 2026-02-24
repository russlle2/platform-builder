Contact page and widget for aromatherapy site

This chunk provides the contact page and local interactive tools for the aromatherapy site.

Files included:
- contact.html: The Connect page — contains a Session Planner and a Blend Builder. Both are implemented with local JavaScript and do not rely on external services.

Key behaviours and features:
- Session Planner: collect brief intake (name, goals, weekly rhythm, skin sensitivity, notes). "Create plan" builds a plaintext summary shown in-page. "Copy summary" copies the text to the clipboard. Reset clears fields.
- Blend Builder: choose a vibe (Relax, Focus, Uplift, Grounding, Sleep), bottle size (10 ml or 30 ml), and a dilution target (1%, 2%, 3%). "Make blend" produces a friendly "blend card" with an approximate drops table and a short recipe, assuming ~20 drops/ml. Copy and save (download) features are included.
- Safety-first language: all outputs avoid medical claims and use supportive language ("may support" phrasing is recommended for use elsewhere). The FAQ includes dilution guidance, patch test instructions, pregnancy and pet notes.
- No external fonts, images, or CDNs are used. The page uses an inline SVG decorative element for visual texture.

Placeholders used in the template (replace them when rendering the site):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for integrators:
- The contact form is local-only in this chunk and does not submit to a server. Wire it to your backend if required.
- Dilution calculations are approximate and assume ~20 drops per milliliter. This is clearly noted in the UI; keep that note if adjusting calculations.
- The blend builder uses a small set of suggested oils and simple split rules to create approachable examples. All copy avoids medical claims.

Design & behavior:
- Nav uses alternate labels: Home / Offerings / Custom Blends / Boutique / Plans / About / Book / Connect
- Visuals rely on CSS, gradients, and a small inline SVG for the pattern.

Seed data & identifiers:
- slug: aromatherapy-MORE-2026-02-17T16-14-46-342Z-036
- seed: 2365684219
- layoutFamily: aura_editorial
- voiceFamily: mystic_modern
- offerModel: intensive
- sectionPack: hero,diagnostic,plan,micro_habits,pricing,cta

License & safety:
- All guidance in the page is non-medical and safety-forward. Include local legal copy or professional disclaimers as needed for your jurisdiction.
