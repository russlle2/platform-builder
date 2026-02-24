# Contact Page (contact.html) for {{BUSINESS_NAME}}

This bundle contains the contact page for the holistic/integrative medicine site and documentation for customization.

Files included in this chunk:
- contact.html — full single-file contact page with hero, myth_vs_truth, pillars, case_notes, faq, and cta sections. The design follows a split-diagonal aesthetic with an inline SVG pattern so no external assets are required.

Important placeholders to replace (case-sensitive):
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

Notes & guidance
- Visuals: The page uses an inline SVG pattern (embedded in contact.html) plus CSS gradients and a diagonal overlay to create visual richness without external fonts or images.
- Accessibility: Basic keyboard support is included for the FAQ accordion (Enter or Space toggles). The color palette aims for contrast but please run an accessibility check with your final text and accent choices.
- Forms: The contact form is client-side only. It validates name and email and shows a friendly alert. Replace handleSubmit logic with your server endpoint or third-party form handler as needed.
- Legal / clinical copy: The content intentionally avoids promising cures and focuses on education, multi-modal planning, and shared decision-making. Maintain similar language if you customize copy for other pages.

Optional asset (pattern.svg)
- The project guideline asked for a unique SVG background at assets/img/pattern.svg. This contact page embeds a pattern inline to stay self-contained, but if you prefer a separate file, create assets/img/pattern.svg with the SVG below and then reference it via CSS or an <img> tag.

Example pattern.svg content (paste into assets/img/pattern.svg):

<?xml version='1.0' encoding='utf-8'?>
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600' preserveAspectRatio='xMidYMid slice'>
  <defs>
    <pattern id='dotgrid' width='60' height='60' patternUnits='userSpaceOnUse'>
      <rect width='60' height='60' fill='none' />
      <circle cx='8' cy='8' r='2.4' fill='#ffd59e' />
      <circle cx='52' cy='52' r='2.4' fill='#7af0d4' />
      <path d='M0 30 L60 30' stroke='#ffffff' stroke-opacity='0.03' stroke-width='1' />
    </pattern>
  </defs>
  <rect width='100%' height='100%' fill='url(#dotgrid)' />
  <g opacity='0.06' fill='none' stroke='#ffffff'>
    <path d='M-40,520 C120,320 340,700 760,220' stroke-width='2' />
  </g>
</svg>

Customization checklist
- Replace placeholders with real practice info.
- Hook up the form to your scheduling system (or server endpoint) and ensure proper spam protection.
- If you want an external pattern.svg, add the file to assets/img/ and update CSS to use it as a background-image.
- Review clinical text to ensure it matches your scope of practice and local regulations. Do not imply guaranteed outcomes.

Notes about other pages
- This contact page is one of several pages in the full theme (index, services, conditions, approach, pricing, about, book, contact). Make sure navigation labels are kept consistent but can be varied slightly for tone (the full site uses subtle label differences).

Need help?
- If you want, I can generate the remaining pages in the same voice and layout family, or produce a separate assets/img/pattern.svg file and a minified CSS variant.

License
- This code is a starting point. Audit form handlers and third-party integrations for security and privacy compliance (HIPAA or local rules) before collecting protected health information.