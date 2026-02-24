# Contact page (chunk 4)

This bundle contains the contact page and a README for the sound bath site.

Files included:
- contact.html: Complete contact + information page formatted for the "bold_playful" layout family and a clinical-calm voice. Includes: hero, social_proof, benefits, process, faq, lead_magnet, cta sections; form for inquiries; what-to-bring list; contraindications disclaimer; session flow; contact meta.

How to use:
1. Place contact.html in the root of your static site alongside index.html, events.html, private-sessions.html, pricing.html, about.html, faq.html, and book.html.
2. Replace the placeholders with real values:
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
3. Confirm the form actions (POST targets) point to your backend endpoints or a form service. Current form actions use `{{PRIMARY_CTA_URL}}/contact-submit` and `{{PRIMARY_CTA_URL}}/subscribe` as placeholders.

Design notes:
- No external images or fonts are used. Visual richness is achieved with gradients, CSS, and an inline SVG background.
- The page follows the hybrid offer model: clearly displays both group and private options and includes a lead magnet for email capture.
- Accessibility: contrast and large tap targets were considered; include ARIA labels or server-side validation as needed.

Customization tips:
- To change the background pattern, swap the SVG in the <svg class="bg-svg"> block inside contact.html.
- To alter the instrument palette mentioned across the site, maintain variation between pages (crystal bowls, gong, chimes, tuning forks, monochord, etc.).
- Keep nav links consistent but vary link labels across templates for uniqueness (e.g., "Connect" vs "Contact").

If you need the assets folder (pattern SVG) or additional pages (index/events/private-sessions/etc.), request the next chunk and specify which files to generate.