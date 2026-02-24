# Contact Page & Microfeatures

This bundle contains two files for the contact page chunk of a holistic/integrative medicine site.

Files included:
- contact.html — the full contact page with local CSS and JavaScript. It includes interactive micro-features:
  - Proof Gallery: rotates testimonials, shows credibility badges with hover tooltips, keyboard focus pauses rotation.
  - Pricing Comparator: a monthly vs package toggle with smooth animated numbers.
  - Micro comparator variant for a compact pricing display.
  - Contact form (local, non-submitting) that provides inline acknowledgment.

- README.md — this file (you are reading it).

Placeholders
- The HTML uses placeholders that should be replaced by your templating system or by search/replace:
  - {{BUSINESS_NAME}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}

How to use
1. Drop contact.html into your site root or a test folder alongside the other site pages.
2. Replace placeholder tokens with real values or let your server-side template engine inject them.
3. Open contact.html in a browser. The Proof Gallery rotates automatically; you can also use Prev/Next.
4. Use the Pricing Comparator buttons to toggle prices and watch the number animation.

Notes
- No external assets or fonts are used. Visual texture comes from an inline SVG pattern.
- The contact form is a front-end demo and does not send data to a backend. Replace handleSubmit() with real submission logic to integrate with your service.
- The testimonials and pricing data are inlined in the page's script for simplicity; adapt as necessary.

Accessibility
- The testimonial rotation pauses when relevant elements are focused for keyboard users.
- Tooltips are shown on hover and available to screen readers as they are DOM elements included in the badge markup.

License / Attribution
- This code is provided for your project. No third-party dependencies.

Enjoy! If you need variants (modal scheduling flow, server hooks for form submission, or CSV export for leads), ask and I can extend this chunk.