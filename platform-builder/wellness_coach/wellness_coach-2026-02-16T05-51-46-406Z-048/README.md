# Chunk 4 — Contact Page

This bundle contains the contact page and a README for the wellness coach template.

Files included:
- contact.html — full contact page, responsive, warm "earthy_warm" aesthetic, voice: coach_friend.

Notes & how to customize:
- Placeholders present throughout and should be replaced by your templating or build system:
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

- Navigation links reference the other pages in the site: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html.
- Design decisions:
  - Warm cream background, terracotta accent colors, rounded cards and organic SVG shapes to match the "earthy_warm" layout family.
  - Emphasis on approachable, outcome-focused copy: discovery call, lead magnet, hybrid coaching option.
  - No external fonts or resources; all styling is inlined in the page for portability.

- SVGs: to keep bundle self-contained, SVG artwork is inlined in the HTML (unique hero, avatar, and pattern shapes). If you prefer separate files, extract the <svg> blocks and save them as:
  - assets/img/hero.svg
  - assets/img/avatar.svg
  - assets/img/pattern.svg
  Ensure the svg code remains unique for each file.

- Form behavior: lightweight client-side validation is provided. The form currently simulates a send and shows an alert. Replace with server endpoint or integration (Zapier, Formspree, hosting provider) as needed.

- Accessibility: labels are associated with form controls; buttons and links have clear text. Consider adding aria-live region if you change the confirmation to inline messaging instead of alert.

- To iterate:
  - Edit color tokens in the <style> :root section to adapt the palette.
  - Swap the inlined SVGs with illustrations that match your brand, keeping them local (no external requests).
  - Replace the lead-magnet link (/lead-magnet.html) with your actual asset or sign-up route.

If you need the remaining pages (index, about, programs, etc.) for the full site bundle or separate SVG files saved to assets/img/, tell me which items you want next and I will generate them to match the same design system and placeholders.