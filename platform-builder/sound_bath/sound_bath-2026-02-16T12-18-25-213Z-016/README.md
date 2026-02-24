# Contact Page — {{BUSINESS_NAME}} (sound_bath)

This build contains the contact page template for the sound bath website.

Files in this bundle:
- contact.html — full contact page with form, pre-session guidance, contraindications, flow description, and CTA.

Placeholders (replace with your real values):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{FACILITATOR_NAME}}
- {{VENUE_NAME}}
- {{NEXT_EVENT_DATE}}

Notes:
- The page uses a hybrid offer model: it opens a mailto for immediate client confirmation and also POSTs JSON to {{PRIMARY_CTA_URL}} for server-side processing.
- Visual richness is created via CSS gradients and an inline SVG decorative pattern; no external fonts or CDNs are used.
- Accessibility: form elements include labels and ARIA-friendly structure. Ensure server-side validation is implemented when handling submissions.

Content specifics required by the sound bath niche:
- Includes "what to bring", "contraindications" disclaimer, and a description of session flow.
- Instruments referenced for private work: crystal bowls, gong, chimes, tuning forks, monochord (varied across the site).

Integration:
- Drop this file into your site root.
- Ensure the {{PRIMARY_CTA_URL}} endpoint accepts POST JSON when the form is used.
- Replace placeholders automatically or via templating engine before serving.

Design voice: clinical_calm; layout styling: bold_playful.

If you need alternate nav labels, different flow details, or a localization for another city, request a tailored revision.