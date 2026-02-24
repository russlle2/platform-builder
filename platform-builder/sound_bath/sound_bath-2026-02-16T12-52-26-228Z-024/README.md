Project: sound_bath
Slug: sound_bath-2026-02-16T12-52-26-228Z-024
Seed: 2607187760
Layout family: bold_playful
Voice: practical_guide
Offer model: vip_day

Overview:
This bundle contains the contact page (contact.html) and this README. The contact page is designed for a premium, sensory-focused sound bath business and contains the required section pack: hero, diagnostic, plan, micro_habits, pricing, cta.

Files in this chunk:
- contact.html — A complete contact & booking page with:
  - Hero: strong visual header, CTA, contact details
  - Diagnostic: contraindication checklist and safety copy
  - Plan: step-by-step VIP Day booking flow
  - Micro Habits: what to bring & simple pre/post practices
  - Pricing: concise tiered pricing including VIP Day
  - CTA: primary call-to-action with placeholders

Placeholders to replace (keep braces):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{FACILITATOR_NAME}}
- {{VENUE_NAME}}
- {{NEXT_EVENT_DATE}}

Design notes:
- Visual richness is achieved via CSS gradients, glass-card surfaces, and an embedded SVG pattern at the top of contact.html. For a site-wide asset, include a unique file at assets/img/pattern.svg (not included in this chunk) and replace or augment the inline SVG as desired.
- The page emphasizes a premium sensory experience: descriptive flow, instruments referenced (e.g., tuning forks, crystal bowls, gong, monochord, chimes, rainstick), and clear contraindication guidance.
- Navigation labels intentionally vary from other pages (e.g., "Gatherings", "Live", "1:1 & Groups", "Investment", "Story", "Questions", "Reserve", "Connect") to meet uniqueness requirements.

Developer notes:
- The contact form uses a mailto fallback to open the visitor's email client. Replace with your server endpoint or a form service if you want server-side capture.
- The diagnostic check uses basic client-side logic to surface contraindication warnings. Always follow-up with a professional assessment if needed.
- Replace placeholders with real values. Keep curly braces intact until replaced by your templating system.
- This page references no external fonts or CDNs.

Accessibility & safety:
- The page includes a clear contraindication checklist and explicit copy advising clients to disclose medical conditions.
- The booking flow explains arrival, sound session length, and integration to set expectations.

Recommended next steps:
- Add global assets: assets/img/pattern.svg (unique SVG), logo files, and favicon.
- Implement a server-side form handler to capture leads and diagnostics.
- Localize or expand copy to reflect facilitator tone and regional details.

Pages in the full site (for context):
- index.html
- events.html
- private-sessions.html
- pricing.html
- about.html
- faq.html
- book.html
- contact.html

Generated with seed 2607187760 and slug sound_bath-2026-02-16T12-52-26-228Z-024.