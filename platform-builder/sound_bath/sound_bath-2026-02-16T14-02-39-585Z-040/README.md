Contact page for the sound bath site (layoutFamily: lux_gallery, voice: mystic_modern).

This file set includes the contact page and instructions for its placeholders and behavior.

Files included in this bundle chunk:
- contact.html — the full contact page with hero, social_proof, benefits, process, faq, lead_magnet, and cta sections.

Placeholders to replace in your build system:
- {{BUSINESS_NAME}} — business/brand name
- {{TAGLINE}} — short descriptive line
- {{PHONE}} — contact phone for tel: links
- {{EMAIL}} — contact email for mailto: links and forms
- {{PRIMARY_CTA_LABEL}} — text for primary CTA buttons (e.g., "Request" or "Book Now")
- {{PRIMARY_CTA_URL}} — form action / booking endpoint
- {{CITY}} — city where offerings take place
- {{STATE}} — state or region
- {{FACILITATOR_NAME}} — lead facilitator name
- {{VENUE_NAME}} — venue name
- {{NEXT_EVENT_DATE}} — next public event date displayed in footer

Design notes:
- Visual richness is achieved with CSS gradients, glassy panels, and an external SVG pattern referenced at assets/img/pattern.svg (unique SVG should be provided elsewhere in the project).
- No external fonts or CDNs used; layout relies on system fonts.
- The contact form posts to {{PRIMARY_CTA_URL}} and includes fields for name, email, phone, inquiry type, and a message. A checkbox for consent is included for contact permission.

Accessibility & content requirements met:
- Sensory + premium tone throughout; flow of a session is outlined under "Flow of a session".
- "What to bring" list and a contraindications-style disclaimer under the FAQ (epilepsy, pregnancy, implanted devices, psychiatric conditions) are present.
- The page features lead magnet signup, testimonials, and clear CTAs for booking and emailing.

Usage:
Place contact.html into your site root. Ensure the pattern SVG exists at assets/img/pattern.svg and that server-side form handling is configured at {{PRIMARY_CTA_URL}}. Replace placeholders server-side or during build time.