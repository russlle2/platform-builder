This chunk provides the contact page for the holistic/integrative medicine site.

Files included:
- contact.html — A glass-morphism, clinic-focused contact page with an embedded SVG background pattern. The layout emphasizes education, whole-person framework, hybrid (tele + in-person) offerings, and a privacy-minded contact form that opens the default mail client.

Placeholders to replace in templates:
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

Design notes:
- Layout uses translucent "glass" panels, soft gradients, and an inline SVG pattern for visual richness without external assets.
- Voice: calm, clinical, and education-forward. No promises or guaranteed cures are offered — language emphasizes partnership and learning.
- Offer model: hybrid (telehealth + in-person). Pricing references are high-level with a link to Plans.
- Form: lightweight, uses mailto to route messages. This is intentional to keep the page self-contained and privacy-conscious; swap with server handling as needed.

Integration tips:
- Drop contact.html into your site alongside index.html and other pages; the nav links assume the root relative structure.
- If you want a separate SVG asset at assets/img/pattern.svg, extract the <svg class="bg"> block and save it, then reference it with CSS background-image or <img>. The current template embeds the pattern to maintain a single-file component.
- Replace placeholders with actual values. Ensure phone/URL values are properly formatted for tel: and href use.

Accessibility & compliance:
- The form is simple and uses semantic labels. The page avoids storing PHI. For intake requiring protected health information, route through secure, HIPAA-compliant systems.

Customization suggestions:
- Tweak colors in the :root CSS variables to match branding.
- Adjust the initial visit durations and pricing summaries to reflect your practice.
- If you add a back-end, replace the mailto behavior with an AJAX POST to your secure endpoint and remove mailto handling.

End of chunk.