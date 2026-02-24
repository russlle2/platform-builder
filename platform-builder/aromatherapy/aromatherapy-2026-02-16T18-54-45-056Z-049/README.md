Contact page and pattern instructions for the aromatherapy site

Files included in this chunk:
- contact.html  — full contact page with glass-morphism styling, accessible form UI, VIP Day pitch, micro-habits, pricing snapshot, CTA, and safety-forward FAQ.

Notes and developer instructions:
- This build uses an inline SVG background pattern inside contact.html for immediate visual richness. For a reusable asset, copy the SVG below to assets/img/pattern.svg in the project and reference it as needed.

assets/img/pattern.svg content (drop into that path):

<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="g1" x1="0" x2="1">
      <stop offset="0%" stop-color="#1f2937" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#071126" stop-opacity="0.45"/>
    </linearGradient>
    <pattern id="p1" width="140" height="140" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
      <rect width="140" height="140" fill="url(#g1)" />
      <circle cx="14" cy="14" r="2.4" fill="#7ee3c4" opacity="0.06" />
      <circle cx="70" cy="70" r="1.4" fill="#6cc6ff" opacity="0.045" />
      <path d="M0 140 L140 0" stroke="#8ee3c6" stroke-opacity="0.035" stroke-width="1" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p1)" />
  <g transform="translate(1000,60) rotate(20)" opacity="0.12">
    <ellipse rx="320" ry="140" fill="#7ee3c4" />
  </g>
  <g transform="translate(60,680)" opacity="0.08">
    <ellipse rx="480" ry="210" fill="#60a5fa" />
  </g>
</svg>

Placeholders present in contact.html (replace at build time):
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

Design notes (voiceFamily=practical_guide, layoutFamily=glass_morphism):
- Tone is pragmatic and safety-forward; the content avoids medical claims and emphasizes patch testing, dilution, pets and pregnancy checks.
- Visuals rely on CSS glass effects, gradients, and the SVG pattern for depth — no external assets referenced.
- The contact form is a UI demo (no backend); the onsubmit handler alerts and points to the {{EMAIL}} placeholder.

Accessibility & dev considerations:
- Focus states included for keyboard navigation.
- Use the provided pattern.svg for other pages to maintain a consistent visual language; adjust opacity via CSS if necessary.

If you want the SVG inlined into other pages, reuse the <svg> block from the top of contact.html or reference the saved assets/img/pattern.svg as a background image in CSS.