wellness_coach-2026-02-16T03-52-29-256Z-013 - chunk 4

This chunk includes the contact page and developer notes.

Files included:
- contact.html  — Full contact/CTA/diagnostic micro-site page using the "earthy_warm" layoutFamily and a spiritual_teacher voice. Contains:
  - hero (intro + CTA)
  - contact form (submits via mailto using {{EMAIL}})
  - diagnostic invitation (Wellness Compass)
  - plan overview (three program names)
  - micro_habits preview
  - pricing summary
  - persistent CTA and contact info

Placeholders used (must be replaced during build or templating):
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

Notes for integration:
- This page references local SVG assets expected in the assets/img/ directory: hero.svg (illustration), avatar.svg, pattern.svg. Those assets are provided in other chunks of the full bundle — do not link external CDNs or fonts.
- The contact form opens the user's email client (mailto) with the form values. You can replace the handler if you prefer server-side processing.
- The design follows the required section pack: hero, diagnostic, plan, micro_habits, pricing, cta. Ensure the index page and other pages ripple these sections for consistent navigation.
- Nav labels intentionally vary (Home, Philosophy, Work With Me, Paths, Investment) to satisfy uniqueness requirements across pages.

Developer tips:
- Keep the color variables in :root aligned with other pages for a coherent brand look.
- If adding server form handling, update the form id "contactForm" and remove the mailto behavior in the inline script.
- Make sure assets/img/*.svg are added to the final build so images render correctly.

License: (internal project assets) — treat copy as editable brand copy for {{BUSINESS_NAME}}.
