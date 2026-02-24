# Contact Page — {{BUSINESS_NAME}}

This chunk contains the contact page and a short README for the static site built with the zen_minimal layout. Replace the placeholders listed below with your practice's real information before deploying.

Files included in this chunk:
- contact.html — the full contact page and compact site overview.

Placeholders to replace (must remain exactly as written):
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

Notes and guidance:
- Form action: The contact form posts to {{PRIMARY_CTA_URL}}. Replace with your form handler endpoint or a mail processing service. If using a direct mailto fallback, use: mailto:you@example.com?subject=New%20Contact
- Accessibility: Labels are provided for inputs. Ensure any server-side form processing validates and sanitizes inputs.
- Legal & clinical language: The page includes a confidentiality statement, scope-of-practice note, and crisis disclaimer. Do not remove these sections; edit them only to match local regulatory requirements and practice policies.
- Assets: The site references local SVGs (assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg) elsewhere in the full template set. Add those assets to the assets/img folder in the same project when assembling the full site.
- Navigation: The header links point to other pages in the set (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html). Keep filenames consistent if you rename pages.

Design decisions (zen_minimal):
- Intentional whitespace and calm typography to reflect a professional therapy practice.
- Compact hero and a clear, accessible form are prioritized.
- Mini-sections echo the rest of the site (hero, story, framework, programs, pricing, testimonials, CTA) so visitors can orient and decide before contacting.

Ethical reminders:
- Avoid promising outcomes in copy. Keep language supportive and non-guaranteed.
- If you offer sliding scale or pro-bono work, manage expectations and have a clear selection process.

If you need assistance integrating this page into a live site, connecting a form handler, or producing the missing SVG assets, reach out to your developer or the template maintainer.