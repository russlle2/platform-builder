Contact page and developer notes for private_practice_therapist site.

Files in this bundle:
- contact.html: The full contact + session-planner page.

Purpose:
- contact.html holds a contact form, a lightweight Session Planner widget, confidentiality/scope language, and accessible scroll-trigger reveals.

Key features implemented:
1) Scroll-triggered section reveal
   - Uses IntersectionObserver to add a "revealed" class when elements enter the viewport.
   - Respects user motion preferences via window.matchMedia('(prefers-reduced-motion: reduce)'). If reduced motion is enabled, elements appear immediately without animation.

2) Session Planner interactive widget
   - Users fill a few fields (presenting concern, primary goal, session range, pace, notes).
   - "Create plan" composes a plaintext summary suitable for copying or downloading.
   - "Copy" uses navigator.clipboard when available with a fallback to document.execCommand.
   - "Download" creates a text file and triggers a download (session-plan.txt).
   - Output area is updated with textContent and marked aria-live=\"polite\" for screen reader users.

Accessibility & UX notes:
- All dynamic updates use accessible patterns: aria-live for the planner output; form controls are labeled.
- Reduced motion preferences are respected.
- Interactive controls are keyboard accessible.

Therapeutic & compliance notes (content included in page):
- The contact page includes confidentiality language, scope boundaries, and a crisis note. It intentionally avoids claims or guarantees, and it does not present emergency services as part of the practice. Replace placeholders appropriately:
  - {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}

Nav labels (intentionally different):
- Welcome (index.html)
- Practitioner (about.html)
- Areas (specialties.html)
- Method (approach.html)
- Investment (fees.html)
- Questions (faq.html)
- Schedule (book.html)
- Connect (contact.html)

Design notes:
- Visual texture references an SVG pattern at assets/img/pattern.svg for background details. The SVG file should be provided in the assets/img directory. No external fonts or CDNs are used.
- Color tokens and simple shadow system are defined in :root for easy tweaking.

Developer notes:
- The contact form is a client-side stub to prevent accidental submissions while integrating with your backend. Replace the form handler with your preferred submission endpoint or replace the alert with network code.
- The planner plaintext format is intentionally minimal to be easy to copy into messages or intake forms. It is not a clinical record and should be treated as preparatory material.

Privacy & legal:
- Keep this page's confidentiality and crisis language up to date according to your jurisdictional requirements.

Integration checklist for deployment:
- Replace placeholder tokens with real values.
- Provide assets/img/pattern.svg (unique SVG pattern for background).
- Connect contact form to your secure intake endpoint if you want server-side messaging/storage.

If you need an alternate copy tone or additional export formats (PDF, e-mail prefill), tell me which direction you prefer and I will extend the widget accordingly.