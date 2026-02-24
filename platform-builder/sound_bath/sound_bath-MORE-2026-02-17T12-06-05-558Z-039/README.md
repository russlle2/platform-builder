Chunk 4 — contact page and notes for the sound_bath site

Files included in this chunk:
- contact.html — the contact page with a local guided-exercise modal, scroll-reveal logic that respects prefers-reduced-motion, contact form, calendar list teaser, and contraindications information.

Placeholders used (do not replace here, left for templating):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design & technical notes:
- The page uses a local SVG pattern at assets/img/pattern.svg for the hero background (unique pattern expected within the full bundle).
- The guided exercise modal includes three micro-practices: breathing (visual pulse timer), journaling (two-minute prompt), and intention (quick save-to-clipboard). All run with vanilla JS and no external resources.
- Scroll reveals are driven by IntersectionObserver and honor prefers-reduced-motion by making elements visible immediately when reduced motion is requested.
- No external fonts, images, or CDNs are referenced — all visuals are CSS and the pattern SVG file.

Accessibility & safety:
- Modal supports Escape to close and has simple focus-friendly controls.
- Contraindications and safety notice are included in the benefits section; users with specific medical concerns are advised to consult clinicians.

Usage:
- Drop this file into the site root alongside the other HTML files. Ensure assets/img/pattern.svg exists and matches the unique visual identity.

Seed: 808332031
Slug: sound_bath-MORE-2026-02-17T12-06-05-558Z-039
Layout family: earthy_warm
Voice family: mystic_modern
Offer model: intensive
Section pack: hero,social_proof,benefits,process,faq,cta

Generated: chunk 4 of the site bundle.