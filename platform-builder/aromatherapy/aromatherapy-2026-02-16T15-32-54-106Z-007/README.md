# Aromatherapy Site — Contact Page (Chunk 4)

This bundle contains two files for chunk 4 of the aromatherapy website build.

Files included:

- `contact.html` — full contact/connect page with inline SVG background pattern, responsive layout, safety-forward copy, and an accessible contact form.
- `README.md` — this file with instructions and the recommended SVG asset content.

Design notes

- Layout family: earthy_warm. Colors are warm terracotta and sage with soft parchment backgrounds.
- Voice: warm_storyteller — copy invites ritual-making while emphasizing safety and non-medical framing.
- Offer model: membership is referenced in the copy and CTAs.
- Navigation labels are intentionally varied for uniqueness (e.g., "Offerings", "Aroma Library", "Memberships", "Sessions", "Connect").
- No external images, fonts, or CDNs are used. Visual richness is achieved via CSS gradients, an inline SVG pattern, and careful spacing.

Placeholders (keep these in templates and replace at build-time):

- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}}

Accessibility & safety reminders

- Language intentionally avoids medical claims. Phrases like "supports" and "ritual" are used instead of treatment claims.
- FAQ and callouts include information about dilution, patch testing, pregnancy, and pets.
- The contact form includes explicit consent text and a non-medical disclaimer.

SVG asset (recommended)

A unique background SVG pattern is expected at `assets/img/pattern.svg` for use across pages. If you prefer a separate file instead of the inline SVG already included in `contact.html`, create `assets/img/pattern.svg` with the following content:

<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <pattern id="leafPatternFile" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
      <rect width="120" height="120" fill="transparent"></rect>
      <g transform="translate(20,20)" fill="none" stroke-opacity="0.22" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 60 C 18 30, 52 30, 60 60" stroke="#7a9a6e" stroke-width="3" />
        <path d="M30 80 C 36 54, 84 54, 90 80" stroke="#a65a3b" stroke-width="2" />
        <circle cx="70" cy="28" r="5" fill="#d9bba8" opacity="0.6" />
      </g>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#leafPatternFile)" />
</svg>

Implementation notes

- The `contact.html` page is a standalone static page. Replace the placeholders during your templating/build step.
- Navigation links point to the expected pages: index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, contact.html.
- The contact form currently prevents default submission and shows a simple alert for demo. Replace this behavior with your backend or form handling service.
- Keep copy safety-first: when adding blend descriptions or testimonial-like case notes, avoid any language that suggests cure or medical efficacy.

Further chunks will include the other site pages and the finalized `assets/img/pattern.svg` file if you prefer it externalized. If you want the pattern file created here instead of later, let me know and I will include it in the next update.