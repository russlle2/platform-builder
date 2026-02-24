This folder contains the contact page and a small README for the holistic_medicine site (slug: holistic_medicine-MORE-2026-02-17T18-58-32-892Z-014).

Files included:
- contact.html — The Connect page. Contains:
  - Contact form (non-production, mock submission) with placeholders: {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{BUSINESS_NAME}}, {{CITY}}, {{STATE}}.
  - Pricing Comparator: toggle between Monthly and Package. Animated numeric transition implemented with requestAnimationFrame for smooth changes. Price values are stored on the .price element via data-month and data-package attributes.
  - Mood-to-Method selector: pick a mood (Tired, Anxious, Blocked, Curious). The recommended approach, bullet list, and primary CTA label update. The primary CTA redirects to {{PRIMARY_CTA_URL}} with a mood query parameter.
  - Visual pattern reference: assets/img/pattern.svg used as a decorative background in the pattern-wrap element.

How to test interactive features locally:
1. Place this file in the site root alongside the other pages (index.html, services.html, etc.).
2. Ensure assets/img/pattern.svg exists (a simple SVG tile will work). The page references it for decorative background.
3. Open contact.html in a modern browser.
4. Pricing comparator: click "Monthly" or "Package". Watch the number animate and the note change.
5. Mood-to-Method: click a mood button. The recommended method list, intro, and the CTA label will update. Click the CTA to be redirected to {{PRIMARY_CTA_URL}} with ?mood=<key> appended.
6. Contact form: fill and submit to see a mock send state.

Notes and constraints:
- No external fonts or CDNs are used. All visuals are CSS and the referenced SVG pattern.
- Do not rely on this form for production; replace with a secure backend endpoint for real submissions.
- This page uses placeholders to be replaced by templating or a build step.

Design decisions:
- The page follows a mystic_modern voice with soft gradients and a subtle conic logo mark.
- The pricing comparator emphasizes two ways of engaging (ongoing vs package) with an animated number to help perception.
- The Mood-to-Method control is intended as an educational triage to help visitors choose an appropriate next step; it does not provide medical diagnosis or guaranteed outcomes.

If you need adjustments to copy, additional moods, or different pricing tiers, edit the methods object and the data-* attributes in contact.html.