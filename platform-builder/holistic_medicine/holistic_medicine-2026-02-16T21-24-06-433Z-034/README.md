Contact page and usage notes for holistic_medicine site (layoutFamily=glass_morphism, voiceFamily=mystic_modern).

Files in this chunk:
- contact.html  -> The "Connect" page for direct outreach. Contains a glassmorphism UI, an accessible contact form, and an aside with logistical notes.
- README.md     -> This help file.

Placeholders to replace when deploying:
- {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{CREDENTIALS}}

Notes & integration guidance:
- The form posts to {{PRIMARY_CTA_URL}}; replace with your form handler or serverless endpoint (e.g., /api/contact or an external form provider). Keep method="post".
- No external assets are referenced. The visuals rely on CSS + an SVG background at assets/img/pattern.svg. Ensure assets/img/pattern.svg is included in the full bundle for the decorative background.
- Accessibility: form controls include labels and required attributes. Consent checkbox includes an educational disclaimer (no guaranteed cures). Keep that messaging intact for regulatory clarity.
- Navigation labels intentionally vary across pages: this file uses "Sanctuary" for home and "Connect" for contact to keep the voice consistent but not repetitive.

Design notes:
- Glass morphism theme uses subtle gradients, backdrop-filter blur, and an inline decorative SVG in the aside.
- No external fonts or CDNs are used; system font stack is applied.

Developer tips:
- To enable secure intake linking, change the mailto links or form action to your HIPAA-compliant intake provider if needed.
- The site assumes a separate assets/img/pattern.svg to create the repeating motif; that file should contain a lightweight SVG pattern (no external references) to match the mystic_modern aesthetic.

Content guidance for holistic practice pages:
- Always avoid language promising cures. Focus on education, collaboration, assessments, and optional labs.
- Intake process: describe intake, shared plan, follow ups, and optional labs (on the approach page). Conditions page should list common concerns with disclaimers.

If you need a variant with alternative nav labels, adjusted color accents, or a simplified (no-js) submission example, request a follow-up and include your deployment target (static site, Netlify functions, server-backed form endpoint).