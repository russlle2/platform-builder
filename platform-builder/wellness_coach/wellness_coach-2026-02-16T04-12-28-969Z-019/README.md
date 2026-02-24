# {{BUSINESS_NAME}} — Contact Page (clinic_modern)

This bundle includes the contact page template and usage notes for the wellness coach site.

Files in this chunk:
- contact.html — Fully built clinic_modern contact page with required sections.

Placeholders you must replace (or inject at runtime):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{COACH_NAME}}
- {{CREDENTIALS}}
- {{CITY}}
- {{STATE}}

Design notes:
- Layout follows the clinic_modern family: crisp grid, muted palette, clinical calm.
- Sections included (visible on this page and intended to ripple across the site): hero, social_proof, benefits, process, faq, lead_magnet, cta.
- Voice: gentle_therapist — supportive and pragmatic language focusing on habits and outcomes.
- Program model mentioned: VIP Day is referenced as a short, high-impact option.

Interaction:
- The contact form performs basic client-side validation and shows a success message. Replace with your backend endpoint as needed.
- Lead magnet form is a placeholder that triggers an alert for demo purposes.

Accessibility & responsiveness:
- Uses semantic elements where practical; responsive grid collapses to single column under 900px.

Integration tips:
- Swap in your SVG assets if you prefer external files. This template uses inline unique SVGs to avoid external assets.
- Ensure server-side sanitization and email handling for the contact form.

License: internal project template for {{BUSINESS_NAME}}.
