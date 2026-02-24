# Chunk 4 — contact.html + README

This bundle contains the contact page and an explanatory README for the private practice therapist web templates.

Files included:
- contact.html — A responsive, earthy-warm contact page designed for a private practice therapist. Contains:
  - A warm hero/contact panel and an aside with a quick message form
  - Contact links (phone, email) and a clear booking CTA
  - Practice notes: confidentiality, crisis disclaimer, scope and boundaries
  - Testimonials excerpt and clinician card
  - Inline CSS (no external assets) and a small JavaScript mailto form handler

Placeholders used (replace with real values):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{THERAPIST_NAME}}
- {{LICENSE}}
- {{MODALITIES}}
- {{CITY}}
- {{STATE}}

Design notes:
- layoutFamily: earthy_warm — organic shapes, warmer spacing, friendly tone
- voiceFamily: coach_friend — supportive, clear, ethically grounded copy
- The page intentionally avoids medical claims and includes an explicit crisis disclaimer and confidentiality note.

Integration tips:
- The contact form uses a mailto fallback via JavaScript to open the user’s email client. Replace with a server-side form handler or third-party form endpoint if you want direct submissions.
- The template references local SVG assets (assets/img/avatar.svg, assets/img/pattern.svg, assets/img/hero.svg) which are expected to be provided in other chunks. Update paths if needed.
- Navigation links assume the presence of index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html. Adjust labels and active states as you integrate.

Accessibility & privacy:
- Form fields include labels and required attributes. Ensure focus styles and keyboard navigation are preserved when customizing.
- Keep the confidentiality and crisis text visible and up-to-date with your jurisdictional requirements and professional guidelines.

License & usage:
- This content is a structural template. Replace placeholders with accurate practice details before publishing.

End of chunk 4 README.