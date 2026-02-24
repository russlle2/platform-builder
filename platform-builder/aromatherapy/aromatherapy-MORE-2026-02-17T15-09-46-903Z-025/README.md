# Contact page and interactive tools — {{BUSINESS_NAME}}

This bundle contains the contact page (contact.html) for a small aromatherapy practitioner's website. It is created with a minimal, local-first approach: no external assets, no images, and no CDN dependencies. Replace placeholders ({{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}) with your real data.

Files included:
- contact.html — the full contact page with interactive widgets and FAQ.

How to run locally:
1. Place contact.html in the root of a simple static site folder alongside the other site pages (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html) if you have them.
2. Open contact.html in a modern browser (Chrome, Edge, Firefox, Safari).
3. No build steps required — everything is client-side.

Features implemented on contact.html:
- Responsive contact layout with practical copy and safety-first language.
- Session Planner widget:
  - Choose intention, session length, and frequency.
  - Drafts a plaintext plan summary in the browser.
  - Copy the summary to clipboard to paste into an inquiry or save locally.
- Blend Builder (quick):
  - Choose a vibe (calm, focus, uplift, sleep), who the blend is for (adult, child, pregnant, pet), and a container size.
  - The tool calculates a conservative dilution and a drops-based recipe (approximate) for the chosen container.
  - Displays a visual blend card and allows copying the blend card as plain text or printing it.
  - All output uses safety-forward language: "may support", patch-test reminders, and consult-a-provider guidance for pregnancy/pets.

Design notes and constraints:
- Minimal, zen-minimal visual language; a subtle inline SVG pattern is embedded as a data URL to create texture without external files.
- Unique navigation labels (Studio, Practices, Formulas, Market, Investment, Our Roots, Reserve, Reach Out) that link to the correct page filenames.
- All interactive behavior is implemented in vanilla JavaScript to keep the page self-contained.

Safety and legal:
- This page intentionally avoids medical claims. Language such as "may support" and "educational only" is used throughout.
- The FAQ includes instructions about dilution, patch testing, pets, and pregnancy.
- The Blend Builder is informative and not a substitute for a consultation with a qualified aromatherapist or medical professional.

Customizing and extending:
- To add more blend presets, edit the `blendPresets` object in the <script> section of contact.html.
- To change dilution defaults, adjust the logic in `makeBlend()`.
- To integrate server-side form handling, replace the form `onsubmit` handler with a normal POST to your backend endpoint and secure it as needed.

Accessibility:
- Simple semantic HTML with form labels and reasonable contrast for body text.
- All copy/copy-to-clipboard actions are confirmed with alerts; you can replace these with non-blocking toasts if desired.

Notes for deployment:
- Because everything is local, serve the files with any static server (for example, `python -m http.server` or a local dev server).
- Remember to replace placeholders with live contact and booking information before publishing.

If you want a second chunk (other pages or assets like a dedicated SVG file), request the next build and list which files should be included.