This bundle contains the contact page and supporting README for the aura_editorial front-end templates.

Files included in this chunk:
- contact.html — The full contact / connect page for {{BUSINESS_NAME}}. This file intentionally includes the required section pack so that the tone, structure, and calls-to-action ripple across the site: hero, diagnostic, plan, micro_habits, pricing, cta.

Notes for implementers:
- Replace placeholders across the file with real values: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{THERAPIST_NAME}}, {{LICENSE}}, {{MODALITIES}}, {{CITY}}, {{STATE}}.
- The design is editorial and high-contrast (aura_editorial). The page relies on local SVGs assumed to be in assets/img/:
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg
  Ensure those files are unique and stored locally; do not reference external CDNs or fonts.

Therapist & ethical considerations:
- The page includes confidentiality language, a crisis disclaimer, and scope boundaries (no medication management). These statements are intentionally general; adapt them to local licensing and practice policies.
- Avoid making curative or medical claims on public pages. Keep language supportive and non-guaranteed.

Accessibility & behavior:
- The contact form in contact.html is a static prototype and uses a small script to simulate submission. Replace the form action with your scheduling or server endpoint when integrating.
- There is a prominent phone and email contact, and a clear crisis notice advising emergency services as appropriate.

Styling & structure:
- The file contains inline CSS for portability. For production, extract styles into a separate CSS file and ensure responsive breakpoints are preserved.

Other pages (not included in this chunk): index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html should be present in the full project. Nav labels in contact.html intentionally use variant names (e.g., "Offerings", "Investment") to maintain distinct navigation language across templates.

License:
- This is a design prototype. Replace all placeholder content with accurate clinical and legal information for your practice before publishing.

If you need the complementary files or the SVG assets created to match the editorial theme, request the next chunk and specify preferred color accents or illustration style.