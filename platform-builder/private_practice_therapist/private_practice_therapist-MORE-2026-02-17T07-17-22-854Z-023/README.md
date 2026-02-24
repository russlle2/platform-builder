Contact page and notes for private_practice_therapist-MORE-2026-02-17T07-17-22-854Z-023

Files in this chunk:
- contact.html — the contact/booking page with interactive utilities.

What this page includes:
- Header navigation with links to all site pages (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html).
- Hero area with a "Mood-to-Method" selector: select how you are feeling and the page will suggest a tailored approach. The suggested method updates the descriptive copy, pre-fills a read-only field in the contact form, and updates the primary CTA label and the form action to include the chosen method as a query parameter.
- Pricing Comparator: a two-button toggle (Monthly vs Package). When toggled the numeric prices animate smoothly between the two sets of values (animated via requestAnimationFrame for a pleasing, lightweight effect). The comparator is intentionally framed as two different program models (Renewal Sessions / monthly membership vs Intensive Focus Package) to avoid reuse of prior naming.
- Contact form collects name, email, phone, a brief message, and the recommended method. The form submits to {{PRIMARY_CTA_URL}}. Primary CTA text is {{PRIMARY_CTA_LABEL}} by default and will update when a mood is selected.
- Confidentiality, scope boundaries, and crisis note included. No guarantees or medical claims are made.

Developer notes:
- The page references assets/img/pattern.svg for a repeating background pattern. Ensure that unique SVG is added to that path in the assets for visual continuity.
- Placeholders used in the template that must be replaced by the site engine or build step:
  - {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}
- The interactive behavior is implemented in plain JS within contact.html. It is unobtrusive: if JS is disabled the form still posts to {{PRIMARY_CTA_URL}} and the pricing defaults to the initial monthly values shown.
- Accessibility: moods are buttons and support keyboard activation; pricing toggle uses buttons with aria-selected updates.

How to test locally:
1. Place this file in your project root (or appropriate pages folder).
2. Add an SVG pattern at assets/img/pattern.svg — the HTML expects it at that path.
3. Open contact.html in a modern browser. Clicking moods updates the recommendation and CTA; toggling the pricing buttons animates numbers.
4. Inspect the form action to verify the recommended method query parameter appears after selecting a mood.

Design decisions and constraints:
- Voice is calm and clinician-forward; copy avoids promises and medical claims and includes clear crisis guidance.
- Pricing labels intentionally avoid prior exact phrases; program names are presented as distinct options.
- No external fonts, CDNs, or images are referenced.

If you need the accompanying SVG pattern, other site pages, or server-side wiring for placeholder substitution, request the next chunk and I will provide them.