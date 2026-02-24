Project: {{BUSINESS_NAME}} — Wellness Coach (lux_gallery)

Purpose:
This chunk contains the contact page and documentation for the wellness coaching site. The design is gallery-focused (lux_gallery) with restrained motion and large SVG artwork. The tone is scientist_guide: evidence-minded, guiding, and practical.

Files in this bundle:
- contact.html — the contact and lead-capture page. It includes the site header, hero, myth_vs_truth, pillars, case_studies, faq, and cta sections (purposefully echoed from the home index to create a ripple across pages).

Placeholders (replace in build/deployment):
- {{BUSINESS_NAME}} — organization name
- {{TAGLINE}} — short descriptor
- {{PHONE}} — primary phone number (format: tel link)
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — primary CTA button text (e.g., "Start a consult")
- {{PRIMARY_CTA_URL}} — primary CTA target (form action / booking URL)
- {{COACH_NAME}} — coach full name
- {{CREDENTIALS}} — credentials string (e.g., "MSc, Behavior Coach")
- {{CITY}} and {{STATE}} — location so copy can reference place

Notes and integration tips:
- This page references three local SVG assets (place them in assets/img/):
  - hero.svg — large gallery art used in the hero.
  - avatar.svg — small avatar used in case studies.
  - pattern.svg — decorative pattern used as a background accent.

- No external fonts or CDNs are used. The stylesheet is embedded for portability.
- Navigation labels are intentionally varied compared to other pages; links point to the canonical filenames used in the project (index.html, about.html, programs.html, pricing.html, contact.html, book.html).
- The contact form posts to {{PRIMARY_CTA_URL}}. In a static preview you can replace that with a form handling endpoint (Netlify, Formspree, server endpoint) or a mailto link.

Accessibility and SEO:
- Semantic headings and ARIA labels used for major regions.
- Alt text is present for visual assets; the decorative pattern has an empty alt.

Design rationale:
- lux_gallery: large SVG artwork anchors the layout and creates an editorial gallery feel. Cards use subtle glass textures and restrained contrast.
- scientist_guide tone: copy focuses on measurable outcomes, habit systems, and practical next steps—no medical claims.

Testing:
- Open contact.html locally in a browser. Ensure assets exist at assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg. Replace placeholders with real values before publishing.

If you need the remaining pages, assets, or an alternate layout family, request the next chunk and specify which files to generate.