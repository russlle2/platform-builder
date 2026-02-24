This bundle contains the contact page and usage notes for the wellness coach site.

Files:
- contact.html: The interactive contact page with two key micro-features: a Pricing Comparator and a Mood-to-Method selector.

How to use:
1. Open contact.html in a browser (no server required).
2. Mood-to-Method selector: click any mood button (Stuck, Overloaded, Curious, Need Rest). The recommended approach title, description, and the CTA will morph with a short animation and the CTA links will receive a mood query parameter.
3. Pricing Comparator: toggle between "Monthly" and "Pack". Prices animate to new values using a smooth easing function.
4. Contact form: the form is client-side only and prevents submission; replace with your form endpoint as needed. The "Request Call" button will attempt to call the phone number placeholder.

Placeholders to replace in the template:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes:
- The decorative pattern is embedded as inline SVG in contact.html; no external assets are required.
- All interactive behavior is implemented in local JavaScript within contact.html.
- This page intentionally frames outcomes, habits, and frameworks without making medical claims.

If you integrate this into a larger site, ensure links in the nav match your final structure (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html).