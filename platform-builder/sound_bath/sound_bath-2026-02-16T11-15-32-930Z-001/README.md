Contact page (chunk 4) for the sound_bath site.

Overview:
- Files included in this bundle:
  - contact.html
  - README.md (this file)

Purpose:
- contact.html is a standalone contact and intake page that follows the site’s glass_morphism aesthetic and clinical_calm voice.
- It includes required sections: hero, diagnostic (intake form), plan (how we propose and design), micro_habits (pre/post session tips), pricing snapshot, and CTA.
- The page references a unique SVG background pattern located at assets/img/pattern.svg. An inline SVG is embedded in the page as the visual background; ensure to add the external SVG file at the given path for reuse across the site.

Placeholders to replace:
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

Developer notes:
- No external assets or CDNs are used. Visual richness is achieved via CSS gradients, glassy panels, and an embedded SVG pattern.
- Navigation labels intentionally vary from other pages (e.g., "Gatherings", "Intimate Sessions", "Investment") to meet uniqueness rules.
- The contact form is a stub: it prevents default submission and shows an alert. Replace with real form handling (fetch/XHR) to integrate with your backend or serverless endpoint.
- Make sure to add assets/img/pattern.svg (unique pattern) to the repository to satisfy the site-wide requirement for a shared SVG background.

Accessibility & content:
- The page includes clear headings, labels, and semantic markup.
- It contains the required sound bath content: what to bring, contraindications disclaimer, and a session flow summary.
- Instrument list in this file is: crystal bowls, tuning forks, monochord, koshi chimes, frame drum. Vary instrument lists across other pages for uniqueness.

Styling:
- Root variables control colors and glass parameters. Adjust to your design system.
- The layout is responsive; the two-column grid collapses beneath 900px.

How this chunk fits the project:
- This is chunk 4 and supplies the contact interface. Other pages (index, events, private sessions, pricing, about, faq, book) are in other chunks and should reuse the same visual language while varying headings and copy for uniqueness.

Deploy:
- Replace placeholders, add pattern.svg to assets/img/, and commit. Ensure forms are wired to an endpoint if you want live submissions.

If you need a variant with a server-integrated form handler or localized copy for a specific city, ask for a follow-up and provide backend endpoint details.