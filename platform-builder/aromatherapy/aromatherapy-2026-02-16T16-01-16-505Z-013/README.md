This chunk contains the contact page and usage notes for the aromatherapy site bundle.

Files included:
- contact.html — The full contact/connect page with hero, social proof, benefits, process, FAQ, lead magnet, and CTA sections. Uses placeholders to be replaced by your templating system:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}
  - {{PRACTITIONER_NAME}}
  - {{FAVORITE_BLEND}} (not required on this page but available globally)

Notes and integration tips:
- The page references an SVG background at assets/img/pattern.svg. Ensure that file is present in the assets/img folder (created in another chunk) for the repeating pattern to render.
- The contact form uses a mailto action as a simple submit fallback. Replace with your preferred backend endpoint or AJAX handler to capture requests.
- Lead magnet: clicking the guide button creates and downloads a plain text guide and opens a mailto prefilled to {{EMAIL}} so the lead receives follow-up instructions. Replace or extend this with a server-side mailing list flow if desired.
- Accessibility: form fields include labels and reasonable focus/contrast. Further accessibility audits are recommended.

Design/voice:
- The layout follows the "lux_gallery" family: generous cards, soft gradients, and an elegant palette.
- Voice follows the "practical_guide" style: clear, safety-forward, and action-oriented.
- The offer model is "VIP Day" and the process section outlines the steps of that VIP Day.

Safety & content rules:
- No medical claims are made. The FAQ includes dilution, patch test, pets, and pregnancy guidance as required.
- All aromatherapy notes are supportive and framed as self-care.

Customization suggestions:
- Replace placeholder values with real business data before publishing.
- Swap the mailto form action for a secure server endpoint and integrate an anti-spam measure (reCAPTCHA or honeypot) if needed.
- Consider converting the plain-text lead magnet to a PDF generated server-side for improved branding.

Chunk 4 delivered files only; other pages (index.html, blends.html, shop.html, etc.) are in other chunks of the full bundle.