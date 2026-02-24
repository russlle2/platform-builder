# wellness_coach-2026-02-16T05-55-03-079Z-049 (chunk 4)

This chunk contains the Contact page and a README for a zen_minimal wellness coach site. Files included in this bundle:

- contact.html — Full contact page with hero, pillars, myth_vs_truth, case_studies, faq, and CTA sections. Minimal, accessible layout; inline CSS and JS only.
- README.md — This file (brief notes and placeholders).

Placeholders used throughout the templates (replace when deploying):
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

How to preview:
1. Place this project root alongside other chunks that include assets (assets/img/*.svg) and the other HTML pages.
2. Open contact.html in a browser. No server is required for basic preview.

Notes / constraints:
- The contact page intentionally avoids medical claims; language focuses on habits, frameworks, and measurable outcomes.
- No external fonts, scripts, or CDNs are used.
- The page references local SVGs expected in assets/img (hero.svg, avatar.svg, pattern.svg) — include those from other chunks or your asset build.

If you need an alternate ordering or a version with the contact form posted to an API endpoint, I can add a minimal fetch() example and environment variables for the endpoint.