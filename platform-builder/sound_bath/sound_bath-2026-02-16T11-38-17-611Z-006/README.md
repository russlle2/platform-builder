Contact page and usage notes for sound_bath project (chunk 4)

Files in this chunk:
- contact.html  -> A full, sensory-focused contact page for {{BUSINESS_NAME}} with hero, myth_vs_truth, pillars, case_notes, faq, and cta sections included.
- README.md     -> This file.

Purpose:
- Use contact.html as the primary Connect/Contact page in the site. It contains a contact form (posts to {{PRIMARY_CTA_URL}}/contact-submit), phone and email placeholders, what-to-bring guidance, contraindications, flow description, instrument notes, and a CTA.

Placeholders to replace in your deployment:
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
- Visual richness is achieved with an inline SVG background and warm gradients; no external assets are referenced.
- The page follows the earthy_warm layout family and a playful_premium voice.
- The contact form includes options for group, private, couples, and corporate bookings.

Accessibility & content:
- Includes a clear contraindications disclaimer; please ensure this text is reviewed by your practitioner.
- "What to bring" and session flow are present so guests know what to expect.

How to integrate:
- Drop contact.html into your site root or route it to '/contact'. Update placeholders and the form endpoint.
- If you want a separate assets/svg file, extract the inline <svg> from contact.html into assets/img/pattern.svg and update styles accordingly.

End of chunk 4.