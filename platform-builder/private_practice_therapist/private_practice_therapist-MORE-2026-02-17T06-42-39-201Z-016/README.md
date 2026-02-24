# Contact Page — private_practice_therapist

This bundle contains the contact page and a short README for the static frontend chunk for the private practice therapist site.

Files included in this chunk:
- contact.html — self-contained page with inline CSS and JavaScript.

Key features implemented on contact.html:
- Hero and site navigation with an original label set (Home, Meet, Focus Areas, Method, Investment, Help, Schedule, Connect).
- Contact form (static; no backend) with simple client-side validation and friendly confirmation.
- Mood-to-Method selector: choose a current state (Overwhelmed, Stuck, Needing direction, Recovering). The panel morphs its content and the CTA text/href updates to include a mood query parameter. Animations are implemented via small JS fades and content replacement.
- Pricing Comparator (micro): toggle between "monthly" and "package" modes using a switch. Numbers animate using requestAnimationFrame and an easing function; CTA text in the pricing card also updates.
- Accessibility: buttons are keyboard-interactive and elements use aria attributes where appropriate.
- Policy and crisis language: confidentiality, scope boundaries, and a crisis notice are included to comply with therapist rules.

Placeholders used (must be replaced in deployment):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes on assets:
- The page references a local SVG pattern at `assets/img/pattern.svg` for background texture. Ensure that file exists in your site assets so the hero background displays as intended.

How to view locally:
1. Place this file (contact.html) in the site folder alongside the other pages.
2. Ensure `assets/img/pattern.svg` exists and any other site assets are available.
3. Open contact.html directly in a browser (no server required) or serve the folder with a simple static server (e.g., `npx serve` or `python -m http.server`).

Design notes / constraints:
- No external fonts, images, or CDNs are used in this file.
- The code avoids medical claims and uses supportive, clinician-appropriate language.
- This is a static demo for UI and UX; form submissions need a backend or form handling service to be fully functional.

If you need the companion SVG pattern or adaptations (e.g., different CTA behaviors or additional moods/pricing tiers), I can generate those in the next chunk.