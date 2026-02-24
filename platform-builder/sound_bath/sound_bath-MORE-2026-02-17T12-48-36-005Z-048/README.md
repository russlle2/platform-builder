Contact page and developer notes for the sound bath events site (chunk 4).

Files included in this chunk:
- contact.html — the full contact page with interactive features.

Purpose:
- Provide a clear contact surface for prospective attendees and clients.
- Offer a local JS 'sound preference mixer' that updates program recommendations in real time.
- Include a rotating "Proof Gallery" (testimonials) with credibility badges that reveal details on hover.
- Surface a responsible contraindications section and encourage pre-booking consultation where needed.

Key features and how to test them locally:
1) Sound preference mixer
   - Visible on the contact page as three buttons: Gentle, Medium, Intense.
   - Click a button to change the recommended program list; the contact form stores the selected level in a data attribute.
   - Keyboard shortcuts: press 1 for Gentle, 2 for Medium, 3 for Intense.

2) Proof Gallery rotation
   - Auto-rotates testimonials every ~4.2 seconds.
   - Controls let you navigate: previous, pause/play, next. Clicking any control pauses automatic rotation (except play).
   - Badges to the right show additional details via CSS tooltips on hover.

3) Contact form (mocked)
   - Form validates required fields; on submit, it simulates sending and shows a simple alert after a short delay.
   - The payload (mocked) includes the selected sound intensity.

Accessibility & practical notes:
- The layout uses semantic form controls and aria-labels for key regions.
- Colors are chosen for contrast on a dark background; tweak CSS variables in the <head> for brand adjustments.

Placeholders in the template (must be replaced by your templating/server engine):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design & differences to past templates:
- Navigation labels are intentionally different: Gatherings, Calendar, Private, Rates, The Method, Practical Qs, Reserve, Connect.
- CTA phrasing and program language differ from previous versions; recommendations use distinct program names and durations.
- The page includes a custom inline SVG pattern (unique visual identity) rather than external image assets.

Notes for integration:
- This chunk intentionally includes only contact.html for this pass. The rest of the site pages are referenced by link paths and should exist in the same directory when assembling the full site.
- There is no external dependency; all JS and CSS are local and inlined.

Contraindications and safety:
- The contact page includes a short, responsible list of contraindications and advises contacting the team or a provider if unsure. Keep this copy accurate to your organization's policies.

Developer seed/metadata (for records):
- Slug: sound_bath-MORE-2026-02-17T12-48-36-005Z-048
- Seed: 182486170
- Layout family: clinic_modern
- Voice family: practical_guide
- Offer model: events_series
- Section pack: hero,gallery,what_to_expect,objections,cta

If you need additional pages (index, events, private-sessions, pricing, about, faq, book) or the SVG asset at assets/img/pattern.svg created separately, request the next chunk and specify any branding refinements.