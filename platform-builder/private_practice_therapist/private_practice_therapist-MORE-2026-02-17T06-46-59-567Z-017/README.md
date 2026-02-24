Contact page (chunk 4) for the private practice template.

Files included in this bundle:
- contact.html — the Contact / Connect page with inline CSS and JS.

Purpose and notes:
- This page provides a clinician-written tone for contact, intake basics, and a local "Try a short exercise" modal offering breathing, journaling, and intention-setting.
- All interactive features run purely on the page (no network calls): guided exercise saves to localStorage only when the user chooses to save.
- Form submissions are stored to localStorage as drafts for demonstration; no external submission logic is included.

Accessibility & motion:
- The site respects prefers-reduced-motion: reveal animations are disabled when the user requests reduced motion, and the guided breathing modal falls back to non-animated text guidance.
- Modal includes basic aria attributes and keyboard support (Esc closes the modal).

Customizable placeholders (must be replaced during deployment):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}} (used on other pages; present here as link target label)
- {{CITY}}
- {{STATE}}

Developer notes:
- The page references an SVG pattern at assets/img/pattern.svg for the hero background. Ensure a unique pattern.svg exists at that path for visual consistency.
- No external assets, fonts, or CDNs are used — everything is inline.
- Script exposes window._pp.openModal and closeModal for quick testing.

Clinical compliance notes (included on page):
- The contact page includes a clear confidentiality summary, scope boundaries (e.g., not an emergency service, medication not prescribed here), and crisis guidance advising users to seek immediate help when in danger.
- Do not present the contact form as a route for emergency care.

How to test locally:
1. Place this file in the project root or appropriate pages directory.
2. Make sure assets/img/pattern.svg exists.
3. Open contact.html in a browser.
4. Click "Try a short exercise" to open the guided modal. Test breathing, journaling save, and intention save. Check localStorage under keys: pp_journal, pp_intention, pp_contacts.

If you need adjustments to the exercise timing, journal prompts, or the phrasing of confidentiality text, edit contact.html directly. The code is intentionally straightforward for clarity and ease of modification.