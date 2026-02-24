# wellness_coach-2026-02-16T05-20-37-864Z-039

This chunk contains the contact page and a README for the wellness coach website built with the "clinic_modern" layout and a "gentle_therapist" voice. The output uses placeholder tokens to be replaced by a templating system or during deployment.

Files included in this chunk:

- contact.html — The contact page. Includes the required section pack: hero, social_proof, benefits, process, faq, lead_magnet, cta. Uses a clinical calm grid, premium spacing, and local inline SVG art. All contact information and calls-to-action use placeholders.

Placeholders used (do NOT replace in this repo):

- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{COACH_NAME}}
- {{CREDENTIALS}}
- {{CITY}}
- {{STATE}}

Design notes:

- Layout family: clinic_modern — crisp grid, card surfaces, precise geometry.
- Voice: gentle_therapist — warm, calm, practical language focused on outcomes and habit design.
- Program model: VIP Day is surfaced in CTAs and the process with a distinct call-to-action.
- No external assets, fonts, or analytics are loaded. The page uses inline styles and inline SVG for the hero graphic and logo placeholder.

Accessibility & behavior:

- Semantic landmarks are used (header, main, aside, footer, section).
- Interactive FAQ uses the native <details> element for keyboard accessibility.
- The lead magnet form is a simple client-side stub to avoid external dependencies; replace with real form handler when integrating.

How this page links with the rest of the site:

- Navigation points to: index.html, programs.html, services.html, pricing.html, testimonials.html, book.html.
- Ensure the rest of the site includes the matching assets (assets/img/avatar.svg, assets/img/hero.svg, assets/img/pattern.svg) if referenced elsewhere.

Integration tips:

- Replace placeholders with real values during build or server-side rendering.
- Hook the lead magnet form to an email provider or CRM; currently it displays a JS alert as a placeholder.
- Keep consistent naming of program tiers across pages but ensure phrasing is varied (this page uses "VIP Day" and "Work With Me"/"Paths" for navigation labels).

Authorship:

- Generated with layoutFamily=clinic_modern, voiceFamily=gentle_therapist, programModel=vip_day.

