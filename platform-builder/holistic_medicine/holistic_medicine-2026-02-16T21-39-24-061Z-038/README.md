Holistic / Integrative Medicine — Contact page (chunk 4)

Files included in this bundle:
- contact.html  — Contact page with form, lead magnet, practitioner info, FAQs, and playful yet premium tone.
- README.md     — This file (you're reading it).

Placeholders to replace in your deployment (keep the double-brace tokens exactly as shown):
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

Notes and usage:
- The page is intentionally self-contained: no external fonts, images, or CDN calls.
- Visual richness is provided via the inline SVG at the top of contact.html and CSS gradients.
- The contact form will open {{PRIMARY_CTA_URL}} in a new tab with simple query params when submitted. If {{PRIMARY_CTA_URL}} is empty it falls back to a mailto to {{EMAIL}}.
- The copy follows integrative/holistic care guidance: it avoids promises or cures and frames services as educational and whole-person.

Accessibility & progressive enhancement:
- Form controls are standard HTML elements. JS enhances interactions but works with mailto fallback.
- The decorative SVG is aria-hidden.

Saving the reusable SVG pattern:
- For asset reuse across other pages, save the following SVG as assets/img/pattern.svg (create folders as needed).
- The SVG below is a unique decorative pattern intended for backgrounds; it uses gradients and subtle dots.

--- Begin assets/img/pattern.svg ---
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='xMidYMid slice'>
  <defs>
    <linearGradient id='bgGrad' x1='0' x2='1'>
      <stop offset='0' stop-color='#f8fff9'/>
      <stop offset='1' stop-color='#fffafe'/>
    </linearGradient>
    <radialGradient id='softGlow' cx='20%' cy='15%'>
      <stop offset='0' stop-color='#ffe7ff' stop-opacity='0.08'/>
      <stop offset='1' stop-color='#6c63ff' stop-opacity='0.02'/>
    </radialGradient>
    <pattern id='tinyDots' width='100' height='100' patternUnits='userSpaceOnUse'>
      <circle cx='8' cy='8' r='1.8' fill='#d9f6ef' />
    </pattern>
  </defs>

  <rect width='100%' height='100%' fill='url(#bgGrad)' />
  <g transform='translate(40,30)'>
    <circle cx='960' cy='90' r='200' fill='url(#softGlow)' />
    <rect x='0' y='100' width='520' height='520' fill='url(#tinyDots)' opacity='0.42' />
    <path d='M240 520 C 340 440, 440 540, 540 480 C 640 420, 740 540, 840 460 L 1200 680 L 0 680 Z' fill='#ecfff8' opacity='0.9' />
  </g>
</svg>
--- End assets/img/pattern.svg ---

Design notes & variations:
- Navigation labeling on contact.html intentionally uses friendlier labels (Home, Care, Conditions, Our Way, Plans, Meet, Book/Reach) to vary voice across the site.
- Tone: playful_premium — gentle, confident, lightly whimsical touches (sparkles, friendly microcopy) combined with clean, modern design.
- Offer model: intensive — callouts mention "intensive consultations" and preparation guides; copy clarifies the educational nature of recommendations.

If you need other pages (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html) produced to match this aesthetic, request the next chunk and specify any additional content or unique SVG variations per page.
