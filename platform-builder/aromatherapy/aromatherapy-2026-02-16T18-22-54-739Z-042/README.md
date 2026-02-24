Project: Aromatherapy Practitioner Site — chunk: contact

This bundle contains the contact page and a short readme for the aromatherapy web project.

Files included:
- contact.html — standalone contact page using the 'aura_editorial' aesthetic and a playful_premium voice. Uses CSS + embedded SVG for visual richness; references assets/img/pattern.svg for a repeated SVG background (unique pattern expected in assets). No external fonts, images, or CDNs.

Placeholders to replace throughout the template:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}}

Notes and dev guidance:
- The contact page prioritizes safety-forward language. It avoids medical claims and points users to consult primary care when relevant.
- The contact form is front-end only: submission is simulated with JS and displays a confirmation. Replace the handler to integrate your server or form service.
- The page links to the rest of the site (/index.html, /services.html, /blends.html, /shop.html, /pricing.html, /about.html, /book.html). Ensure these pages exist in the final build.
- A unique SVG pattern must be provided at assets/img/pattern.svg (this chunk references it). Create a custom, subtly repeating geometry with soft gradients to match the brand palette.
- Accessibility: labels are used for inputs and headings are present. Keep color contrast in mind when theming.

Voice & layout:
- Voice is playful_premium: warm, slightly whimsical, but clearly professional. The phrasing emphasizes listening, safety, and craft.
- Layout family: aura_editorial — roomy panels, soft gradients, glass-like cards, and an editorial scale of type.

Safety & content rules for site-wide pages (reminder):
- All pages must be safety-forward. Do not make medical claims or promise outcomes.
- Blends page (not in this chunk) must list 8–12 blends with top/middle/base notes, aroma profile, and a "supports" statement phrased non-medically (e.g., "supports calm-minded focus" not "treats anxiety").
- Shop page (not in this chunk) must include product cards for kits, roll-ons, diffusers as static UI elements.
- FAQ (site-wide) should include dilution guidance, patch testing, pets, and pregnancy notes.

Developer seed & meta:
- slug: aromatherapy-2026-02-16T18-22-54-739Z-042
- seed: 3623322197
- layoutFamily: aura_editorial
- voiceFamily: playful_premium
- offerModel: intensive

Use the placeholders to inject real content. Replace the pattern SVG asset and verify the color palette matches your brand tokens. Enjoy building a sensory-forward, safety-first aromatherapy site.