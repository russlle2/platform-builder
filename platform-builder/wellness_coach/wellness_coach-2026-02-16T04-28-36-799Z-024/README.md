# wellness_coach-2026-02-16T04-28-36-799Z-024 — chunk 4

This bundle contains the contact page and a README describing structure and intent.

Files included in this chunk:
- contact.html — A full contact page designed for the "earthy_warm" layout family with the gentle_therapist voice and VIP Day program model.

Design notes (contact.html):
- Purpose: primary destination for leads to get in touch, request discovery calls, sign up for the lead magnet, or reserve a VIP Day.
- Visual language: warm, organic palette (terracotta accent, sage highlights, soft sand background), rounded cards, generous spacing and approachable type scale.
- Required sections present on this page (these also "ripple" to other pages via nav and CTAs):
  - hero — Lead with values, contact quick-links, and VIP Day highlight (primary visual references assets/img/hero.svg).
  - social_proof — Compact testimonials and avatar image (assets/img/avatar.svg).
  - benefits — Outcome-focused list emphasizing habits, routines, and frameworks.
  - process — Clear step-by-step approach including VIP Day and ongoing work.
  - faq — Frequently asked questions tuned to coaching expectations and timeframe.
  - lead_magnet — Email capture for a free "Daily Reset Checklist" with a simple form that redirects to {{PRIMARY_CTA_URL}} when submitted.
  - cta — Multiple CTAs: request discovery, book VIP Day, phone and email links using {{PHONE}} and {{EMAIL}}.

Technical notes:
- No external assets or CDNs are used. The HTML references local SVGs expected elsewhere in the project: assets/img/hero.svg, assets/img/avatar.svg, assets/img/pattern.svg.
- Placeholders used throughout to be replaced at build or runtime:
  - {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{COACH_NAME}}, {{CREDENTIALS}}, {{CITY}}, {{STATE}}
- Form behavior is intentionally minimal:
  - Lead magnet form navigates to {{PRIMARY_CTA_URL}} with the email as a query parameter.
  - Contact form uses a mailto fallback for static deployments; replace with server endpoint or third-party form handler for production.

Accessibility & responsiveness:
- Uses semantic headings and labels for form fields.
- Layout adapts to narrow screens with stacked columns and larger touch targets.

Customization guidance:
- Swap colors in :root to match branding; keep warm contrast for CTA and sage for supportive accents.
- Replace simple mailto logic with an AJAX POST to capture leads server-side and hook into email/CRM flows.
- Ensure the three SVGs are present at assets/img/hero.svg, assets/img/avatar.svg, and assets/img/pattern.svg and are uniquely crafted for each page template.

Navigation phrasing:
- Nav labels in this file are intentionally varied (Home, About, Paths, Invest, Stories, Book, Connect) to meet the uniqueness requirement across templates. Ensure other pages maintain slight variations to avoid identical headings/link text.

Program & pricing guidance:
- This site uses a VIP Day offering as the highlighted program model; other pages (programs, pricing) should present different program names and pricing framings (e.g., "Foundations", "Quarter Flow", "Sustained Support") to meet uniqueness rules.

If you need the remaining pages or the SVG assets created next, request the next chunk and specify any branding colors, imagery direction, or adjustments to content tone.