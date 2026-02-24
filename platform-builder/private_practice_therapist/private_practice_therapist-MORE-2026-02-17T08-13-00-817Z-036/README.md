Chunk 4: contact.html and README for private_practice_therapist-MORE-2026-02-17T08-13-00-817Z-036

Files included:
- contact.html: The contact page for the practice, complete with a contact form, practice details, and an accessible guided-practice modal (breathing / journaling / intention).

Key features implemented in contact.html:
- Unique navigation labels linking to all site pages (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html).
- Visual interest using a local SVG reference at assets/img/pattern.svg (referenced as a background pattern). The actual SVG file is expected in assets/img/ in the full bundle.
- Scroll-triggered reveal animation for sections using IntersectionObserver; respects users who prefer reduced motion by immediately showing content when prefers-reduced-motion is set.
- A self-contained guided-exercise modal (no external libraries):
  - Breathing: simple cycle (inhale/hold/exhale) with a visible countdown and start/stop controls.
  - Journaling: a textarea with a 5-minute timer and live clock.
  - Intention: quick intent selector with a 30-second brief focus timer.
- Accessible modal behavior: open/close, backdrop click to close, Escape key handling, and sensible aria-hidden state toggling.
- Contact form with client-side handling (alerts user on submit) and clear confidentiality/scope/crisis notes.

Notes for integrators:
- Replace placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- The guided exercises are supportive self-care practices provided client-side only. They are not clinical interventions or crisis resources. Crisis guidance is included in the page copy.
- Ensure the assets/img/pattern.svg file (unique SVG pattern) is present in the final build so the page background pattern displays as intended.

Testing:
- Open contact.html in a browser. Click "Try a short guided practice" to test the modal flows.
- Turn on OS-level prefers-reduced-motion and refresh the page to confirm reveals appear without animation.
- Submit the contact form to see the local confirmation behavior.

Designer/developer notes:
- Styling uses only local CSS and no external fonts or CDNs.
- The page avoids assertive or manipulative language about services; it includes confidentiality and crisis guidance per clinician requirements.
- This page is intentionally minimal-poetic in tone and designed to match an asymmetrical masonry layout family across the site.
