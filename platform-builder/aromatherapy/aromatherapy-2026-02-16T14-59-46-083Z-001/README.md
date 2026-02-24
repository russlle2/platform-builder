# aromatherapy-2026-02-16T14-59-46-083Z-001 — contact.html

This chunk contains two files for the aromatherapy site (layoutFamily: glass_morphism, voice: practical_guide, offerModel: vip_day):

- contact.html — A contact page built with glassmorphism styling, an inline SVG decorative pattern, accessibility-minded form fields, safety-forward FAQ and lead magnet signup. Placeholders are left intact for runtime replacement:
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

Notes & guidance:
- The contact form uses a mailto: action pointing to {{EMAIL}} as a demo. Replace the form action with a server endpoint or third-party capture for production.
- The page intentionally emphasizes safety: dilution, patch tests, pregnancy, pets — avoid any medical claims. Keep language conservative when updating content.
- Visual richness is provided with CSS gradients, glass cards, and a unique inline SVG pattern. No external assets or CDNs are referenced here.
- Nav labels are intentionally varied from other templates ("Sessions", "Store", "Reach") to maintain uniqueness across pages.

Integration:
- Place this file at the root (contact.html). Other pages referenced (index.html, book.html, blends.html, etc.) are expected to be provided in other chunks.
- If you have a centralized assets folder, you may extract the inline SVG pattern to assets/img/pattern.svg and reference it as needed. Ensure the pattern remains unique per page to satisfy uniqueness requirements.

Developer tips:
- Replace mailto form behavior with a POST endpoint to capture leads reliably.
- Keep the FAQ content updated with any regulatory or safety guidance relevant to your region.
- For localization, swap {{CITY}}/{{STATE}} and contact details as needed.

Seed: 2753523596
Slug: aromatherapy-2026-02-16T14-59-46-083Z-001
Layout family: glass_morphism
Voice family: practical_guide
Offer model: vip_day

Generated: chunk 4 (contact + README)
