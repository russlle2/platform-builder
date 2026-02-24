Project: holistic_medicine-MORE-2026-02-17T21-55-00-290Z-045
Seed: 3653333541
Layout family: earthy_warm
Voice family: executive_sharp
Offer model: vip_day

This chunk includes only two files for the contact page deliverable:
- contact.html  — the full contact page with two interactive 'Session Planner' widgets and a scroll-triggered reveal system that respects prefers-reduced-motion.
- README.md     — this file.

Notes for integrators:
- Placeholders in the markup that must be replaced by the deployment system: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- The page references an SVG tile at assets/img/pattern.svg for background texture. That asset is expected to be provided in the overall bundle (not included in this chunk).

Accessibility & behavior:
- Scroll-triggered reveals are implemented with IntersectionObserver and automatically disabled if the user prefers reduced motion; in that case sections are shown immediately.
- Two planners are present on the same page:
  1) Quick Planner — lightweight sketch for a single-session focus.
  2) Detailed Planner — a deeper intake-style builder suitable for VIP Day or multi-session programs.
- Both planners build a plaintext summary, support copying to clipboard, and allow downloading a .txt file.
- The contact form is a local placeholder that demonstrates client-side capture (it does not submit to a server). Replace with your backend endpoint as needed.

Implementation constraints respected:
- No external fonts, CDNs, or images embedded; visual texture is produced via an external SVG tile reference.
- All JS is local and vanilla; no libraries.
- Copy/export features implemented using the Clipboard API and Blob download.

Styling and tone:
- Earthy, warm palette with accessible contrast and compact executive voice.
- Educational, non-curative language; disclaimers are present for urgent/medical situations.

Integration tips:
- Swap placeholders with your environment templating or build step.
- Provide assets/img/pattern.svg with a subtle tile to match the aesthetic.
- Hook the contact form to your intake endpoint (e.g., POST /api/intake) and add server-side validation/security.

If you need the complementary pages (index, services, conditions, approach, pricing, about, book) or the SVG tile, ask for the next chunk and I will produce them following the project's rules and uniqueness constraints.