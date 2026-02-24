Project chunk: Contact page and documentation for {{BUSINESS_NAME}}

Files included:
- contact.html — the contact & next-steps page built for the clinic_modern layout family. Contains the hero, a clinician-style diagnostic (self-check), plan (next steps), micro_habits, pricing summary, contact form (main CTA), and required clinical notices (confidentiality, crisis disclaimer, scope/boundaries).

Placeholders to replace in your deployment pipeline or templating engine:
- {{BUSINESS_NAME}} — clinic or practice name
- {{TAGLINE}} — short descriptive tagline
- {{PHONE}} — main phone number
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — primary call-to-action label (e.g., "Book a Consult")
- {{PRIMARY_CTA_URL}} — primary CTA URL (used on other pages; contact.html links to book.html)
- {{THERAPIST_NAME}} — clinician name
- {{LICENSE}} — clinician license credential (e.g., LCSW, LMFT)
- {{MODALITIES}} — brief list of modalities (e.g., CBT, EMDR, somatic experiencing)
- {{CITY}} — city where in-person care is offered
- {{STATE}} — state

Notes for editors and developers:
- The page is intentionally self-contained: CSS is embedded for a calm, clinical grid feel that suits the clinic_modern layout family.
- Local assets referenced (not included in this chunk):
  - assets/img/hero.svg — decorative hero SVG
  - assets/img/avatar.svg — recommended for therapist avatar on other pages
  - assets/img/pattern.svg — background/pattern as needed
  Ensure those files are unique SVGs and placed at the referenced paths.

Accessibility & ethical considerations:
- The copy avoids promises of cures and includes clear confidentiality and crisis disclaimers. Keep that language intact or consult clinical risk management before making changes.
- The contact form is a client-side placeholder only. Replace the onsubmit handler with your secure form-processing endpoint, and ensure storage/transmission complies with applicable privacy laws (e.g., HIPAA) if you intend to collect protected health information.

Customization tips:
- Swap colors in :root to match your brand. Keep contrast high for legibility.
- Update nav links to match your site structure; links currently point to the set of pages in this project chunk.
- To support multiple cohorts or varied pricing options, expand the pricing section and link to fees.html for full details.

Deployment:
- Drop contact.html into your site root or template system; replace placeholders via your templating engine or a simple script.
- Verify phone/mailto/tel links are updated and test the contact flow.

Legal & privacy:
- This repository includes non-secure form examples. For production, use secure transport (HTTPS) and a backend that complies with local regulations for clinical data.

If you need a companion contact API endpoint or a GDPR/HIPAA-aware form integration example, request the next chunk and include your hosting environment (Netlify, Vercel, custom server) and preferred backend language.