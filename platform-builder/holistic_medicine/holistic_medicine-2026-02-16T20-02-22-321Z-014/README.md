Holistic Medicine — Contact Page (chunk 4)

This chunk provides two files for the holistic_medicine layoutFamily (voice: playful_premium, offerModel: intensive):

Files included:
- contact.html — Complete contact page with hero, story, framework, offers, pricing snippet, testimonials, and CTA. Contains an embedded, unique SVG background pattern. Uses placeholders to be replaced by your templating or build process:
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

- README.md — This file.

Notes & integration guidance:
- Navigation uses varied labels to distinguish this page from other templates — e.g. "Start", "Offerings", "Concerns", "Philosophy", "Plans", "Our Story", "Reserve", "Connect".
- The contact page intentionally refrains from promising cures and emphasizes education, personalized plans, and optional labs as educational tools.
- The contact form posts to {{PRIMARY_CTA_URL}}; ensure your backend or form handler is ready to accept and sanitize submissions.

SVG background:
- For portability, an inline SVG pattern is embedded directly in contact.html. If you prefer a separate asset, create a file at assets/img/pattern.svg with the following sample content and reference it in your CSS or HTML:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7be495" />
      <stop offset="100%" stop-color="#61b6ff" />
    </linearGradient>
    <pattern id="p1" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="rgba(6,16,27,0.0)" />
      <circle cx="8" cy="8" r="1.6" fill="url(#g1)" />
      <circle cx="32" cy="32" r="1.6" fill="url(#g1)" />
    </pattern>
    <filter id="blur"><feGaussianBlur stdDeviation="22" result="b"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#p1)" />
  <g filter="url(#blur)" opacity="0.6">
    <ellipse cx="120" cy="60" rx="220" ry="60" fill="url(#g1)" />
    <ellipse cx="640" cy="320" rx="300" ry="80" fill="#153547" />
  </g>
</svg>

Accessibility & legal:
- All interactive controls have labels and the form uses semantic elements.
- The page includes a brief disclaimer reminding users the content is educational and not emergency care.

Customization tips:
- Replace placeholders at build time with your templating engine or string replacement.
- Adjust colors in the :root CSS variables to match brand guidelines. No external fonts or CDNs are used — change font-family as needed.
- If you host a separate SVG file, reference it in CSS via background-image:url('/assets/img/pattern.svg') or inline the svg as done here.

If you need the remaining pages (index, services, conditions, approach, pricing, about, book) or the actual assets folder (assets/img/pattern.svg) created in another chunk, request the next chunk and reference this file for consistent visual language.
