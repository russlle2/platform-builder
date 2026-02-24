# Contact Page — {{BUSINESS_NAME}}

This chunk includes the contact page and a README describing how to integrate it into the full site.

Files included:
- contact.html — The gallery-style contact template designed for the "lux_gallery" layout.

Purpose and notes:
- The contact page intentionally ripples key sections that must appear across the site: hero, diagnostic, plan, micro_habits, pricing, and CTA. Each section is presented succinctly so users can engage directly from the contact page.
- Local SVG artwork is referenced at `assets/img/hero.svg` and `assets/img/avatar.svg`. Ensure those assets exist in the project assets folder (these were created in another chunk).
- The page uses placeholders that must be replaced at build or runtime:
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

Behavior and forms:
- The diagnostic form posts to `/capture-diagnostic` and the contact form posts to `/contact`. Hook these endpoints to your backend or to a form handler of choice.
- The contact form includes fields for name, phone, email, interest, and a short message. The lead magnet ("7-Minute Daily Ritual") is offered when visitors submit a message.

Design considerations:
- Lux_gallery styling: gallery imagery (SVG), restrained color accents, generous spacing.
- Voice: spiritual_teacher — warm, grounded, outcome-oriented language focused on habits, frameworks, and micro-practices without medical claims.

Customization:
- Update primary accent colors in the inline CSS variables to match brand.
- Replace the placeholder SVGs with the finalized art in `assets/img/` as needed.
- Update form action targets to point at your CRM or scheduling system.

Accessibility & responsiveness:
- The layout is responsive and will stack on smaller screens.
- Ensure SVG alt attributes and link labels are updated for final copy.

Integration tips:
- Keep nav links in sync with other pages (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html).
- The required section pack appears on the index and is referenced throughout the site; this contact page mirrors those sections to aid conversion and reduce friction for users who land directly on contact.

If you need a variant (e.g., lighter background, different CTA language, or alternate micro-habits), provide the desired tone and I will generate a second version.