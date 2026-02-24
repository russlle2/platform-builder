This bundle provides the contact page and a README for the "sound_bath" website template (layoutFamily: lux_gallery).

Files included in this chunk:
- contact.html — full contact and information page tailored for sound bath events and private sessions.

Purpose and notable features:
- Sensory, premium visual design using CSS gradients and an inline SVG ambient background — no external images or CDNs.
- Required sections included: hero, myth_vs_truth, pillars, case_notes, faq, cta.
- Contact form with fields for name, email, phone, inquiry type, preferred date, and message. The form posts to {{PRIMARY_CTA_URL}} (replace with your booking endpoint or server handler).
- Practical content: session flow, "what to bring", contraindications guidance, private & corporate options, and a clear CTA.
- Localizable placeholders present in the HTML: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{NEXT_EVENT_DATE}}. Replace these tokens at build time or via templating.

Accessibility & editorial notes:
- The page emphasizes clear contraindications and invites attendees to report accessibility needs in the contact message.
- Instrument palette used here: gong, chimes, tuning forks, voice harmonics, monochord — varied from other pages to satisfy uniqueness requirements.

Integration tips:
- Ensure your site includes the other pages listed in the project (index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, book.html).
- If using a static site generator, map placeholders to your site's variables.
- The contact form points to {{PRIMARY_CTA_URL}}; for direct email submission replace with a mailto: URI or wire up a serverless function to handle form POSTs.

Customization ideas:
- Tweak color tokens in the <style> root to match your brand palette.
- Expand the FAQ with locality-specific details (parking, transit, arrival time).
- If you host the booking engine externally, make the primary CTA open in a new tab for convenience.

License: This template is provided as-is for integration into your site. Replace the placeholders and extend styles as needed.