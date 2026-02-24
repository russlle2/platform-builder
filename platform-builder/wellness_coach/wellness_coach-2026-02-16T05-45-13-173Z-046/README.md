Contact Page — {{BUSINESS_NAME}} (clinic_modern)

Overview:
This contact.html is a premium, clinic_modern contact template tailored for a wellness coach with a gentle therapist voice. It includes the required section pack echoed from the home template: hero, social_proof, benefits, process, faq, lead_magnet, and cta. The layout is a two-column responsive grid that prioritizes clear contact paths and quick actions (download lead magnet, contact form, book VIP Day).

Files in this bundle chunk:
- contact.html — page for visitor contact, lead capture, FAQ, and CTAs.
- README.md — this file.

Placeholders (replace these before publishing):
- {{BUSINESS_NAME}} — the practice or brand name
- {{TAGLINE}} — brief site tagline
- {{PHONE}} — main contact phone number
- {{EMAIL}} — contact email address
- {{PRIMARY_CTA_LABEL}} — main CTA button text (e.g., "Schedule a Call")
- {{PRIMARY_CTA_URL}} — main CTA href (booking link)
- {{COACH_NAME}} — coach's full name
- {{CREDENTIALS}} — credentials (e.g., PCC, MSW)
- {{CITY}} — local city
- {{STATE}} — local state

Behavior & Integration Notes:
- The contact form and inline lead magnet form have lightweight client-side handlers (no external services). Replace setTimeout simulation with your backend endpoint to persist leads and trigger emails.
- The VIP Day CTA points to {{PRIMARY_CTA_URL}}. Update this to your scheduler (Calendly, Acuity, or an internal booking page).
- All assets referenced (avatar.svg, hero.svg, pattern.svg) are local paths under assets/img/. Ensure those SVG files are included in the final site bundle.

Styling & Accessibility:
- Uses simple, self-contained CSS variables and responsive grid. No external fonts or CDNs.
- Buttons and forms include semantic elements and aria-live support for status messages.

Customization Tips:
- To change color accents, modify --accent and --accent-2 in the :root block.
- To shorten the header links, edit the <nav> in the header.
- If you want form submissions to open a mail client, modify handleSubmit to use a mailto: link or integrate a POST to your API.

Developer Handoff:
- Replace placeholders with real values before launching.
- Provide backend endpoints for lead capture and contact messages, and update the JS handlers accordingly.
- Add the SVG assets to assets/img/ (unique SVGs required for each template):
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg

Legal & Content Guidance:
- The copy avoids medical claims and focuses on habits, outcomes, and frameworks in keeping with wellness coach realism rules.
- Keep the FAQ line clarifying that coaching is not medical advice.

Testing:
1. Open contact.html in a browser locally.
2. Test the lead magnet form — you should see a simulated confirmation message.
3. Test the contact form — fill name and email to see a simulated response and VIP Day redirect if selected.

Questions or edits needed? Update copy, placeholders, or provide API endpoints to wire up form handling and lead delivery.