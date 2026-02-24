# Contact Page & How to Test

This bundle contains the Contact page and notes for the aromatherapy site chunk.

Files included in this chunk:
- contact.html — the contact page with interactive Session Planner and Blend Builder widgets.

About contact.html
- Sections included: hero, social proof, benefits/process, FAQ, CTAs, and two interactive widgets (Session Planner and Blend Builder).
- Placeholders used (do not remove): {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- All text is safety-forward: uses "may support" language and includes dilution / patch test / pregnancy / pets notes in FAQ.
- Navigation labels differ from other pages (Explore, Offerings, Potions, Apothecary, Invest, Origins, Reserve, Connect).

Interactive features (local JS only)
- Session Planner: select a primary aim, choose modalities and session length (click pill controls), then click "Create Plan" to build a plaintext plan in the output box. Click "Copy" to copy the plan to clipboard.
- Blend Builder: choose a vibe and application type (diffuser, topical, spray, inhaler). Click "Suggest Blend" to generate a safe, non-medical blend card and dilution guidance. Click "Copy" to copy the blend card to clipboard.

Accessibility & testing
- Open contact.html in a modern browser. No external assets are required.
- Test the Planner: toggle the pill controls, pick a dropdown aim and click "Create Plan". Verify the output updates and that "Copy" writes to the clipboard.
- Test the Blend Builder: choose vibe + application and click "Suggest Blend". Verify dilution guidance changes per application.
- Test contact form: filling fields and clicking the CTA triggers a simple confirmation alert (stub for backend integration).

Developer notes
- The page uses internal CSS and inline JS. There are no external fonts or CDNs.
- The README intentionally references an SVG pattern concept. If you maintain the assets, create `assets/img/pattern.svg` with a unique motif for the site to match the earthy_warm layout.
- Keep the safety-first language when editing: do not make medical claims.

If you need the rest of the site pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) or the SVG asset, request the next chunk and they will be generated to match the current voice and layout family.