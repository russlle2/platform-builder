Chunk 4 — contact.html

This chunk contains two files for the sound bath site (layoutFamily: zen_minimal, voice: minimal_poetic):

1) contact.html — a sensory, premium contact page that also contains the required section pack (hero, social_proof, benefits, process, faq, lead_magnet, cta). The page includes:
   - Contact form (name, email, phone, interest, message, consent)
   - What to bring, contraindications, and a clear description of the session flow
   - Social proof snippet, benefits summary, FAQs and a lead-magnet subscribe form
   - Inline SVG decorative pattern (no external assets required)

Placeholders used (do not replace if you want templating later):
  {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}

Notes for integration:
  - The primary CTA posts the contact form to {{PRIMARY_CTA_URL}}; change as needed for your backend or form handler.
  - The page references internal site pages: /index.html, /events.html, /private-sessions.html, /about.html, /book.html, /faq.html. Keep filenames consistent across your build.
  - If you want a separate assets/svg file (assets/img/pattern.svg), you can extract the inline <svg> from contact.html and save it there, then update the CSS to load it as a background-image.

Accessibility & safety:
  - The page includes a contraindications disclaimer (pregnancy, pacemaker, recent surgery, psychiatric conditions, epilepsy) — adjust according to your facilitator's policies and local regulations.

Styling & uniqueness:
  - The visual identity is created with CSS gradients, glass panels and an inline SVG pattern to avoid external fonts or CDNs.
  - Keep nav labels varied across pages (this file uses "Gatherings", "Next", "Sessions", "Our Story", "Connect").

Use this file as the canonical contact + signup entry for bookings, private sessions, and general inquiries.