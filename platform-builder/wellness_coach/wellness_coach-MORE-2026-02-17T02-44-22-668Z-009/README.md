# Contact page (chunk 4)

This bundle contains two files for the wellness coach website — focused on the contact page and documentation.

Files included:
- contact.html — Full contact page, styled with a glass-morphism look, contains local JS for interactive micro-features.
- README.md — This file (usage notes and customization guidance).

Placeholders to replace (must remain in templates until replaced at build time):
- {{BUSINESS_NAME}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

What the contact page includes:
- Navigation with a unique label set: Home, Who I Help, Offerings, Pathways, Investment, Stories, Book, Contact.
- A glass-morphism hero with a contact form (local-only; no backend wiring).
- Proof Gallery: rotates testimonials (auto-rotate + prev/next) and shows credibility badges with tooltips. Implemented in-page with vanilla JS.
- Pricing Comparator: toggle between Monthly and VIP Day (package). Numbers animate between values; data attributes on the price element control values.
- Process overview and FAQ (practical, non-medical language). Includes clear note: coaching focuses on outcomes, habits, frameworks — no medical claims.

Key implementation notes:
- No external assets/fonts/CDNs. The page references an SVG pattern at assets/img/pattern.svg for background texture — include a unique SVG there in a different chunk.
- All interactions are local (no network requests). The contact form simulates a send and logs details to console.
- Accessibility: buttons use aria-selected where relevant; the testimonial area updates aria-live="polite".

Customization tips:
- Update placeholder values programmatically in your build/deployment script.
- To change pricing amounts, edit the data-monthly and data-package attributes on the #priceVal element.
- To change testimonials, modify the testimonials array inside the Proof Gallery IIFE in the script block.
- The pattern background can be swapped by replacing assets/img/pattern.svg.

Developer notes:
- The page follows the glass_morphism layout family and an executive_sharp voice — crisp, direct copy.
- Designed to be unique in structure, copy and nav labels compared to other templates.

If you need additional pages or assets from the project (icons, pattern SVG, or other HTML pages), request the next chunk specifying which files you need.