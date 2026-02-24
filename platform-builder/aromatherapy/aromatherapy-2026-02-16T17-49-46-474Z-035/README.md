Chunk 4 — contact.html + README

This bundle provides the contact page for the aromatherapy practice and a brief README.

Files:
- contact.html: Full contact & events landing page. Includes these required sections: hero, social_proof, benefits, process, faq, lead_magnet, cta. The layout follows an earthy_warm palette and a minimal_poetic voice suitable for events_series offerings.

Placeholders present (must be replaced at runtime):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}} (not used on this page but reserved site-wide)

Notes:
- No external assets or CDNs are used; the page creates a repeating SVG pattern inline to achieve texture.
- The contact form is only a UI demo and uses a mailto: action for placeholder behavior; integrate with your backend or form service as needed.
- FAQ is safety-forward: includes dilution guidance, patch testing, pets, and pregnancy notes. Avoids medical claims.
- Navigation labels are intentionally varied (Gather, Offerings, Mixes, Boutique, Tiers, The Root, Reserve, Connect) to keep templates distinct.

Usage:
- Drop this file into your site root alongside the other pages.
- Replace placeholders with real values.
- Optionally wire the form to an endpoint and swap mailto action.

Design:
- Visual richness uses CSS and an inline SVG pattern; tweak colors in the :root for brand alignment.

End of chunk 4.