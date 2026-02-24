Contact page for the "holistic_medicine" site (chunk 4).

Purpose:
- contact.html: A playful, premium-contact page designed for an integrative medicine practice. It doubles as a soft PR page: hero, logistics, safety note, testimonials, and a detailed contact form.
- README.md: This document.

Files in this chunk:
- contact.html — main contact page
- README.md — integration notes and developer tips

Placeholders (leave them intact so integration can replace values):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Design notes & behavior:
- No external fonts or CDNs used. The page relies on system fonts and CSS for a premium editorial feel.
- Visual interest comes from gradients, glass cards, and an SVG pattern background. The SVG file should be unique per project and placed at: assets/img/pattern.svg (not included in this chunk). Ensure that file is created with a subtle, organic pattern to match the holistic brand.
- Navigation labels intentionally vary across pages (e.g., "Our Way" vs "Approach") to satisfy uniqueness rules.
- The contact form uses a mailto fallback (to {{EMAIL}}) to avoid external endpoints; it also links to {{PRIMARY_CTA_URL}} for direct booking. Adjust integration to hook into your booking or form backend as needed.

Holistic medicine content rules enforced:
- Language avoids promising cures; focuses on education, whole-person planning, and realistic language.
- The page references common concerns (stress, sleep, digestion, inflammation, energy) and includes a clear disclaimer that the content is educational and not a substitute for emergency or specialized care.

Accessibility & responsiveness:
- Responsive grid collapses to single-column under 920px.
- Form elements use native labels and required attributes. Additional ARIA improvements can be added during integration.

Integration tips:
- Replace placeholders server-side or during deployment.
- Add CSP headers if serving the SVG pattern to ensure safe loading.
- If you implement a backend form endpoint, replace the handleSubmit() mailto logic with an AJAX POST to your endpoint, and show friendly success / error UI.
- Ensure assets/img/pattern.svg exists and is unique for this project. The SVG should be lightweight and tileable; prefer subtle organic shapes or dot gradients for a calming backdrop.

Notes about uniqueness:
- This page intentionally uses different headings and nav labels than other site pages.
- The voice is playful_premium: warm, slightly whimsical, but professional.

If you need an alternate contact variant (e.g., anonymous intake, Spanish language), request a successor chunk with specific localization or UX adjustments.