Contact page and usage notes for the wellness_coach template (chunk 4).

Files included in this chunk:
- contact.html  — Full contact & conversion page with hero, diagnostic, plan, micro_habits, pricing, and CTA sections.

Placeholders to replace in your deployment:
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
- Layout family: bold_playful — bold geometry, vibrant accents, lively CTAs.
- Voice family: spiritual_teacher — warm, reflective, outcome-oriented language.
- Program model: cohort — cohort naming (Seed, Garden, Sanctuary) appears on this page; program pages should extend this framing.

Developer notes:
- contact.html is self-contained and uses inline styles and scripts for demo behavior. In production, extract CSS to a shared stylesheet and hook the form to your backend or form provider.
- The page references assets/svg illustrations conceptually (avatar, pattern, hero) — these are provided in other chunks under assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg. Ensure those files exist in the compiled site.
- The diagnostic is a lightweight JS interaction that maps one chosen area to a starter suggestion. It does not collect data.
- The contact form handles submission client-side for a friendly UX; replace handleSubmit with a real POST to capture leads (or integrate with your CRM).

Content pointers for editors:
- Keep the required sections visible: hero, diagnostic, plan, micro_habits, pricing, cta.
- Use the PRIMARY_CTA_LABEL and PRIMARY_CTA_URL to control the main conversion button labels and target links.
- Maintain the cohort framing (cohort, peer pod, mentor hours) without making medical claims.

Nav labels in this chunk deliberately use varied language (Paths, Stories, Work With Me) — ensure site navigation across other pages uses matching hrefs (index.html, programs.html, services.html, testimonials.html, pricing.html, book.html, about.html, contact.html).

Accessibility & responsiveness:
- Basic responsive rules included; test on narrow screens.
- Colors are high-contrast but review with your brand palette for accessibility.

If you need an alternate tone (less mystical or more clinical), ask for a version adjusted to a different voiceFamily or layoutFamily.