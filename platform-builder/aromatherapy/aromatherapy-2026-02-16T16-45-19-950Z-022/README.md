Contact page and usage notes for chunk "aromatherapy-2026-02-16T16-45-19-950Z-022"

Files included in this chunk:
- contact.html — the Contact/Connect page for the site. Includes: hero, social_proof, benefits, process, faq, lead_magnet, cta and a contact form.

Placeholders to replace in your build process:
- {{BUSINESS_NAME}} — your business name
- {{TAGLINE}} — short tagline
- {{PHONE}} — phone contact
- {{EMAIL}} — email contact
- {{PRIMARY_CTA_LABEL}} — primary call-to-action label (e.g. "Book Now")
- {{PRIMARY_CTA_URL}} — primary CTA URL
- {{CITY}} — city
- {{STATE}} — state/region
- {{PRACTITIONER_NAME}} — practitioner's name
- {{FAVORITE_BLEND}} — (optional) favorite blend name referenced elsewhere

Design notes:
- Layout family: earthy_warm — warm neutrals, handcrafted SVG pattern, soft gradients, rounded cards.
- Voice: playful_premium — premium tone with light playfulness.
- Offer model: intensive — process section structure supports an intensive consult offering.
- Safety-forward aromatherapy content: dilution guidance, patch-test instructions, pet and pregnancy caution are included; no medical claims.

Developer notes:
- Navigation labels intentionally vary from other pages ("Nest", "Offerings", "Recipes", "Boutique", "Our Story", "Reserve", "Connect"). Ensure link targets match site files.
- The page contains an inline SVG pattern (embedded in the page). If you prefer an external asset, extract the SVG to assets/img/pattern.svg and update the markup accordingly.
- The contact form is non-functional (demo). Replace the form action and onsubmit handler with your server endpoint or client integration.
- CSS is intentionally included inline for simplicity and to avoid external dependencies. No external fonts or CDNs are used.

Accessibility & Best Practices:
- Form fields include placeholders and required attributes; consider adding aria labels if you customize further.
- Keep the safety checkbox and text intact to reinforce informed use of aromatherapy.

If you need additional pages (index, services, blends, shop, pricing, about, book) from this project bundle, they are produced in other chunks. This chunk contains only the contact page and this README.
