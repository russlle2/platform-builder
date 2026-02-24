Project: aromatherapy-2026-02-16T16-39-42-500Z-021 (layoutFamily: clinic_modern)

This chunk contains two files for the site build: contact.html and this README.md.

Purpose
- contact.html: the "Connect" page for {{BUSINESS_NAME}}. It is safety-forward, clinically calm in tone, and follows a hybrid offer model (remote + in-person consults).

Notes on structure and sections
- Required sections included: hero (contact form + quick contact), story, framework (consultation workflow + FAQ highlights), offers (hybrid), pricing snapshot, testimonials, and a CTA.
- Navigation labels were varied to avoid repetition across templates: e.g., "Therapies" (services.html), "Boutique" (shop.html), "Plans" (pricing.html), "Schedule" (book.html), "Connect" (contact.html).

Placeholders
- The page uses the following placeholders which must be replaced during build/deployment:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}
  - {{PRACTITIONER_NAME}}
  - {{FAVORITE_BLEND}} (not used on this page but available globally)

Assets
- The page includes an inline SVG decorative pattern. The project specification requires a unique SVG background at assets/img/pattern.svg — create and place that file in the assets/img directory during the build so other pages can reference the same motif.

Accessibility & UX notes
- Form fields include labels and reasonable focus styles.
- Color contrast is tuned for a calm, clinical aesthetic; adjust variables in the style block if brand colors differ.
- The form submission is stubbed: handleSubmit(e) performs minimal validation and redirects to {{PRIMARY_CTA_URL}} with a query parameter. Replace with a real server endpoint or client-side integration as appropriate.

Aromatherapy safety guidance
- The page is intentionally non-medical and safety-first. It advises patch testing, conservative dilutions, and consulting a licensed healthcare provider when relevant.
- Include fuller FAQ on other pages (e.g., blends.html or about.html) covering: dilution, patch test procedure, pet safety, pregnancy precautions, and when to seek medical advice.

Developer notes
- No external fonts or CDNs are used; all styling is local via the style tag.
- The SVG decorative pattern is embedded directly for immediate display; for broader reuse and uniqueness, also export it to assets/img/pattern.svg.
- Keep the site responsive: the layout collapses to a single column below 980px; adjust breakpoints to match the overall site.
- This page follows the clinic_modern layout family. Keep similar component spacing and form styles in other templates for visual consistency while changing headings and section order as required.

Seed/Slug
- Seed: 2834871982
- Slug: aromatherapy-2026-02-16T16-39-42-500Z-021

Usage
- Integrate contact.html into the site root. Replace placeholders at build time.
- Ensure that assets/img/pattern.svg is created and added to the repository; use the same visual language but keep a unique pattern per site instance.

Legal / Compliance
- No medical claims present. Add a short terms/disclaimer page if the site will discuss health-related topics in more depth.

If you need alternate copy variations (so headings/order differs from other pages) or a code snippet to wire the form to an email service or booking API, request it and specify which provider to integrate.