# Aromatherapy Website — Contact Page (chunk 4)

This bundle contains the contact page and a README for the aromatherapy site project.

Files included in this chunk:

- contact.html — Full contact + VIP Day booking page. Includes hero, social proof, benefits, process, faq, lead magnet, and CTA sections. Contains inline decorative SVG pattern and gradients for visual richness.

Notes & integration:

- Placeholders remain in the HTML and should be replaced by your templating system or via simple string replace:
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

- The contact page is safety-first. It intentionally avoids medical claims and provides guidance about dilution, patch tests, pets, and pregnancy with a practical tone.

- Visual assets: the contact.html includes an inline SVG "pattern" used as decorative art. The broader project requires a unique SVG at assets/img/pattern.svg. If you'd like to extract the inline pattern into that file, use the example below.

Example SVG to save at assets/img/pattern.svg (optional):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="g1" x1="0" x2="1">
      <stop offset="0" stop-color="#6C63FF" stop-opacity="0.9" />
      <stop offset="1" stop-color="#FF7A7A" stop-opacity="0.85" />
    </linearGradient>
    <pattern id="p1" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="transparent" />
      <circle cx="10" cy="10" r="6" fill="url(#g1)" />
      <circle cx="30" cy="30" r="4" fill="#FFF" opacity="0.06" />
    </pattern>
    <filter id="blur"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#p1)" filter="url(#blur)" />
  <g transform="translate(20,20) scale(0.9)">
    <path d="M10 80 C40 10, 160 10, 190 80 C160 150, 40 150, 10 80 Z" fill="url(#g1)" opacity="0.28" />
    <circle cx="120" cy="60" r="22" fill="#FFF" opacity="0.08" />
  </g>
</svg>

Accessibility and progressive enhancement:

- The page uses semantic elements and form labels; the form is wired to a small client-side script that simulates submission and triggers a lead magnet file download.
- Replace the simulated submission with your server endpoint or email integration for production.

Developer tips:

- Keep the safety copy and FAQ consistent across pages (blends, shop, services) but avoid verbatim repetition of headings — vary phrasing and sequence per page.
- The blends page (separate chunk) should list 8–12 blends with top/mid/base notes, aroma profile, and a short "supports" statement that is safety-forward.
- The shop page should present static product cards (kits, roll-ons, diffusers) styled to match the bold_playful layout.

If you need additional pages from the site or extraction of the inline SVG to assets/img/pattern.svg in a future chunk, request the specific files and I will provide them.