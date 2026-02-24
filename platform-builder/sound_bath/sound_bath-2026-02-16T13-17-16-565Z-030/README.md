# Chunk 4 — contact.html

This bundle contains the contact page for the sound bath site and a short README.

Files included:
- contact.html — contact & inquiries page with inline SVG pattern, contact form, quick schedule, what-to-bring guidance, and contraindications note.

Placeholders to replace before deployment:
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

Design notes:
- Layout uses a zen_minimal aesthetic: soft gradients, glass panels, and an inline handcrafted SVG pattern to ensure no external assets.
- Voice is minimal_poetic: succinct, sensory-focused copy for contact and flow description.
- The contact form posts to /contact/submit (server endpoint expected). Adjust as needed for your backend.
- The page includes required content for sound baths: what to bring, contraindications disclaimer, and a description of session flow.

Developer notes:
- All visuals are self-contained (no external images or fonts). The SVG pattern is embedded in contact.html.
- Navigation links reference the standard site pages (index.html, events.html, book.html, private-sessions.html, faq.html). Ensure those files are present in your build.

Accessibility:
- Basic ARIA labeling on the form and nav.
- High contrast accent color and readable sizes for primary copy. Adjust variables in the <style> block to tune color and spacing.

Unique elements:
- The inline SVG pattern is unique to this page; it can be copied to assets/img/pattern.svg if you want a separate asset for other pages.

End of chunk 4.