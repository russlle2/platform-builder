This chunk contains the contact page and supportive notes for the wellness coach site.

Files included in this bundle:
- contact.html — the contact & interactive tooling page for the membership-first offering.

Design notes:
- Layout family: glass_morphism. The page uses translucent panels, subtle blur (backdrop-filter), and a custom inline SVG pattern for background texture.
- Voice family: clinical_calm. Copy is concise, outcome-focused, and avoids medical claims — emphasis is on habits, frameworks, and measurable routines.
- Offer model: membership. The contact form and UI nudge toward membership conversations and plan saving.

Interactive features implemented (local JS only):
1) Progress meter / 30-day Path Map
   - Users select goal checkboxes; hitting "Generate 30-Day Map" creates a simple 30-node timeline.
   - Each node contains a tooltip describing a small habit suggestion for that day (e.g., Move 10–20m, Hydration reminder, Evening wind-down).
   - A short summary estimates habit density.
   - "Save Plan" triggers a local demo alert; real persistence should be implemented in a later backend integration.

2) Proof Gallery (rotating testimonials + credibility badges)
   - Local JS rotates short testimonials every 6 seconds and swaps two credibility badges.
   - Badges expose short tooltip text on hover.

Placeholders present in contact.html (must be replaced in production):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (available for use elsewhere)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Integration notes:
- Navigation links point to the other pages in the site (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html). The visible nav labels are intentionally different: Home Base, Our Approach, Offerings, Pathways, Memberships, Voices, Schedule, Connect.
- The page includes an inline SVG pattern to avoid external asset requirements. If you prefer an external SVG asset, extract the <pattern> into assets/img/pattern.svg and reference it from CSS or an <img> tag.
- No external fonts or CDNs are used; the CSS references system fonts.

Accessibility & behavior:
- The timeline is rendered in DOM and includes tooltip text on each node for screen-reader discoverability (aria-live is present on the path map container).
- The contact form currently triggers a demo alert on submit. Replace the handleSubmit implementation with API integration for production submission.

Developer pointers:
- To persist plans or connect the membership CTA, implement an endpoint that accepts plan payloads (selected goals + generated timeline). Keep the payload schema simple: {name,email,interest,goals,plan}
- The visual variables live in :root; modify colors there to tune the glass effect while preserving contrast.

Notes on uniqueness:
- The page uses a unique inline SVG pattern and different metaphors for navigation and naming ("Pathways", "Home Base", etc.).
- The 30-day builder maps micro-habits to calendar nodes programmatically for a personalized-looking arc without external libraries.

If you need the external SVG file (assets/img/pattern.svg) created as a standalone file, request the next chunk and it will be added to the repository with the same pattern used inline here.