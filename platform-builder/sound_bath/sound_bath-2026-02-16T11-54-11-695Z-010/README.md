Contact page for the sound bath event site (chunk 4).

Purpose:
- A responsive, accessible contact page for {{BUSINESS_NAME}}. Includes contact form, quick info on what to bring, contraindications, flow description, and a booking CTA.

Files in this chunk:
- contact.html — full page ready to drop into your site.

Placeholders to replace or process in your deployment system:
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
- Visuals are implemented with CSS + an inline SVG pattern so there are no external assets required for this page. If you have a central assets folder, you may swap the inline SVG for assets/img/pattern.svg later.
- Form posts to the URL in {{PRIMARY_CTA_URL}}. Adjust method/action as needed for your backend.
- The copy intentionally includes sensory and premium language and a concise contraindications section — keep this content visible when adapting the page.

Design tokens & layout family:
- layoutFamily: clinic_modern
- voiceFamily: practical_guide
- offerModel: vip_day

Unique notes for this chunk:
- Navigation labels use a slightly different wording ("Gatherings", "Reach") to satisfy variant requirements across templates.
- Instruments and flow are described but intentionally varied from other pages to maintain uniqueness.

Seed & slug (reference):
- slug: sound_bath-2026-02-16T11-54-11-695Z-010
- seed: 2578698158

Usage:
- Replace placeholders, upload to your hosting, and wire the form endpoint.
- For private-session bookings, link to private-sessions.html or book.html as needed.

End of README.