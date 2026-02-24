Project: wellness_coach (layoutFamily: aura_editorial)

Overview:
- This bundle contains the contact page and a README for a wellness coach website designed with an editorial, high-contrast aesthetic.
- The full site (other pages) should include: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html.

Files in this chunk:
- contact.html: Complete, self-contained contact page with condensed versions and links of the required site-wide sections (hero, myth_vs_truth, pillars, case_studies, faq, cta). It acts as a ripple: visitors can preview frameworks, case notes, FAQs, and book a clarity call.
- README.md: This file.

Important placeholders (replace these server-side or with a templating step):
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
- Layout family: aura_editorial — large typographic scale, editorial cards, strong contrast. Contact page follows that voice: bold headings, concise supportive copy, and a premium look.
- Accessibility: semantic headings, landmarks, aria-labels added for navigation and form status. Form uses native browser validation.
- No external assets or CDNs are referenced. The page expects local SVGs (assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg) to be present in the assets/img folder created in other chunks.

Sections required across the site:
- hero: editorial hero introducing the offer and contact options. (Shown at top of contact.html.)
- myth_vs_truth: small myth-checker segment that clarifies expectations. (Section id 'myth-truth'.)
- pillars: concise description of core frameworks/habits. (Section id 'pillars'.)
- case_studies: anonymized success notes for social proof. (Section id 'case-studies'.)
- faq: page-level FAQs focused on coaching scope and timeframe. (Section id 'faq'.)
- cta: a final call-to-action block linking to the primary CTA URL.

Implementation hints:
- Maintain unique headings across pages. Avoid copying headings verbatim from other templates. The contact page uses distinct phrasing (e.g., "Reach Out — Let's Map Your Next Habit").
- Keep program names, pricing framing, and FAQ questions varied on other pages to meet uniqueness rules.
- Replace placeholders when building the site. For static deployments, use a build step (sed, templating engine) to inject real values.

Form behavior:
- The contact form on contact.html uses a lightweight on-page handler to acknowledge submissions to the user. For production, wire the form to an email service or server endpoint; currently the action is a mailto fallback for primitive environments.

SVG assets:
- This chunk references assets/img/avatar.svg; ensure the asset files are unique, local SVGs present in the final distribution.

Voice & content constraints:
- Tone: scientist_guide — energetic, evidence-minded, and practical. No medical claims. Focus on habits, frameworks, and outcomes.

If you need the remaining pages or the SVG assets created in the same style (unique SVGs for hero, avatar, pattern), request the next chunk and specify whether to keep consistent motifs or explore variations.