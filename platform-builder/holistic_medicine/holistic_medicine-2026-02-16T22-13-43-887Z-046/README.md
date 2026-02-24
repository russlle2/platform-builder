Holistic Medicine — contact page (chunk 4)

Overview:
- This bundle contains the contact.html page and a README for the holistic/integrative medicine site.
- contact.html is a lightweight, privacy-conscious contact + intake page. It includes a contact form, clinic details, practitioner blurb, hours, and a short "what to expect" section.

Files included in this chunk:
- contact.html — the contact/connect page to place in your site root.

Placeholders used (replace these with real values):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Design notes and choices:
- No external fonts or images are used. Visual style relies on CSS gradients, layout, and an SVG background referenced at assets/img/pattern.svg.
- The page references assets/img/pattern.svg for a site-wide decorative background. If you use a shared pattern, add a unique SVG at that path in your assets folder. The pattern is intentionally subtle and low-opacity so it does not interfere with accessibility.
- Navigation labels are intentionally varied to provide subtle differences from other pages (e.g., "Welcome", "Concerns", "Investment", "Schedule").

Clinical & compliance notes:
- Language intentionally avoids guaranteed cures. The contact form includes a required consent checkbox clarifying that care is individualized and educational in nature.
- Include clear emergency direction: the page tells users not to use the form for urgent needs.
- Any optional lab, supplement, or educational recommendation should be discussed during intake; the page repeats this as a disclaimer.

Form handling and booking:
- The form action posts to {{PRIMARY_CTA_URL}}. Update the action to your server-side handler or third-party form endpoint.
- The page includes a secondary link to {{PRIMARY_CTA_URL}} for direct booking.
- For production, implement server-side validation, spam protection (reCAPTCHA or honeypot), and secure storage of PHI according to applicable laws (e.g., HIPAA in the U.S.).

Where to add the SVG pattern:
- Add your SVG to: assets/img/pattern.svg
- Example approach: a subtle grid or organic wave in soft color with low opacity. Avoid heavy contrast so text remains readable.

Accessibility & responsive behavior:
- The layout is responsive: two-column hero on wide screens, stacked on narrower screens.
- Color contrast favors readability on dark backgrounds, but please test with your final color choices.

Next steps / integration:
1. Place contact.html in your site root or routing system.
2. Add assets/img/pattern.svg to the assets folder (unique SVG). Ensure path matches the one referenced in contact.html.
3. Replace placeholders with real business info and practitioner details.
4. Configure server-side form handling at {{PRIMARY_CTA_URL}} and implement email confirmations or scheduling links as desired.

Notes for developers:
- Styles are inline for portability; extract to a CSS file if you prefer.
- The form currently has minimal JS to prevent double submits. Expand with client-side validation if desired.

License & usage:
- This template is intended for use by clinicians and clinics providing educational, integrative, and whole-person care. Review all clinical and privacy language with legal/compliance advisors if necessary.

Thank you — contact page prepared for the holistic/integrative medicine site.