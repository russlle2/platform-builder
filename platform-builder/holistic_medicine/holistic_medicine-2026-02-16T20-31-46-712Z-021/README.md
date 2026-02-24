Contact page and background asset details for the holistic_medicine site (layoutFamily=clinic_modern)

Files included in this bundle (chunk 4):

- contact.html — Fully standalone contact page designed for {{BUSINESS_NAME}}. It uses an inline SVG background pattern for visual richness and contains a secure contact form, phone/email blocks, VIP Day mention, accessibility features, and educational disclaimers (no guaranteed cures).

Notes & integration:

1) Placeholders to substitute in your build process (do not remove):
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

2) The contact form posts to {{PRIMARY_CTA_URL}}; adjust the action to your form handling endpoint or serverless function.

3) Visual assets: The page includes an inline SVG pattern. For projects that prefer a separate asset file, create assets/img/pattern.svg with the SVG contents below and reference it as a background image in your global CSS.

--- BEGIN assets/img/pattern.svg ---
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="none">
  <defs>
    <linearGradient id="g1" x1="0" x2="1">
      <stop offset="0" stop-color="#e8fbf6" />
      <stop offset="1" stop-color="#f5fff9" />
    </linearGradient>
    <pattern id="p1" width="120" height="120" patternUnits="userSpaceOnUse">
      <rect width="120" height="120" fill="url(#g1)" />
      <circle cx="20" cy="20" r="6" fill="#d1efe6" />
      <circle cx="100" cy="100" r="6" fill="#d1efe6" />
      <g opacity="0.12">
        <path d="M0 60 L120 60" stroke="#bfece3" stroke-width="1.5"/>
        <path d="M60 0 L60 120" stroke="#bfece3" stroke-width="1.5"/>
      </g>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p1)"/>
  <g transform="translate(180,40)" opacity="0.75">
    <circle cx="520" cy="120" r="220" fill="#a9e6d5" />
    <circle cx="120" cy="420" r="160" fill="#d9f6ee" />
  </g>
  <g transform="translate(-40,230)" opacity="0.28">
    <path d="M0 180 C200 20, 520 -40, 900 120 L900 900 L0 900 Z" fill="#eafbf8" />
  </g>
</svg>
--- END assets/img/pattern.svg ---

Accessibility & compliance reminders:
- The contact form contains a honeypot field to reduce spam. Keep it hidden from users (as implemented) and check server-side to drop messages with that field filled.
- The page includes educational text and a clear non-guarantee statement. For any health-related content across the site, maintain clear disclaimers and urge seeking emergency help when appropriate.

Styling & customization tips:
- The page is intentionally self-contained. If integrating into a site generator, move styles into your base stylesheet and replace the inline SVG with the external assets/img/pattern.svg file referenced from CSS (background-image: url('/assets/img/pattern.svg')).
- Buttons and primary colors are driven by CSS variables at the top of contact.html. Adjust those to match your brand palette.

If you need the contact page adapted to a particular framework (React, Liquid, Nunjucks, etc.), tell me which template language and I will provide a converted version.