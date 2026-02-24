Project: Aromatherapy events_series — aura_editorial
Voice: minimal_poetic

This chunk provides the contact page and supporting README for an aromatherapy practitioner site. The contact page is intentionally safety-forward and framed for an events series offering.

Files produced in this chunk:
- contact.html  — contact + hero, ritual, what_to_expect, schedule, pricing, faq, cta (events-focused)
- README.md     — this file explaining usage and providing the SVG pattern content to create assets/img/pattern.svg

Placeholders to replace in the templates:
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

Notes and guidance:
- The contact page avoids medical claims and emphasizes dilution, patch testing, and pet/pregnancy caution in the FAQ.
- Navigation labels vary subtly (e.g., "Offerings", "Apothecary", "Reserve", "Reach") to meet uniqueness requirements.
- Visual richness is provided by CSS and an inline SVG in contact.html. For consistency across the site, create an external SVG asset at assets/img/pattern.svg using the XML below.

Create assets/img/pattern.svg with the following content (save exactly as UTF-8):

<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="380" viewBox="0 0 1200 380" preserveAspectRatio="none">
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0" stop-color="#F08A5D"/>
      <stop offset="1" stop-color="#6B5B95"/>
    </linearGradient>
    <pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(22)">
      <rect width="60" height="60" fill="rgba(255,255,255,0)"/>
      <path d="M0 30h60" stroke="rgba(107,91,149,0.06)" stroke-width="1"/>
      <circle cx="10" cy="10" r="4" fill="url(#g)"/>
    </pattern>
  </defs>
  <rect width="1200" height="380" fill="url(#p)"/>
  <g opacity="0.06" fill="none" stroke="#6B5B95">
    <path d="M0 200 C200 120,400 280,600 200 C800 120,1000 280,1200 200" stroke-width="28" stroke-linecap="round"/>
  </g>
</svg>

Accessibility / production notes:
- The page uses system fonts to avoid external CDNs.
- Keep form action {{PRIMARY_CTA_URL}} updated to your booking endpoint.
- Replace placeholders with live data before publishing.
- Maintain the safety statements. Never make therapeutic or medical claims in copy.

If you need the remaining pages (index, services, blends, shop, pricing, about, book) styled to the same aura_editorial + minimal_poetic voice, request the next chunk and include which pages to prioritize.
