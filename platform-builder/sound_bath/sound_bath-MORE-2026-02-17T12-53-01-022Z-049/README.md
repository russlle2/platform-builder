Contact page and notes for sound bath site.

Files in this chunk:
- contact.html: The contact / connect page. Includes:
  - Header and navigation (uses different labels: Gatherings, Calendar, Sanctuary Sessions, Investment, Story, Questions, Reserve, Connect).
  - Hero with primary CTA placeholder and a "Brief Anchor — Try" button that opens an in-page guided exercise modal (breathing, journaling, intention setting).
  - Contact form with fields for name, phone, email, interest, and message. Form is handled locally and shows a confirmation message (no backend).
  - Contraindications disclaimer included below the form.
  - Several sections set with class "reveal" that are shown with a scroll-triggered reveal implemented with IntersectionObserver, and which respect prefers-reduced-motion.
  - Modal guided practice is implemented in plain JavaScript with timer, step sequencing, and reduced-motion awareness.

Placeholders to replace when deploying:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes for integration:
- The page references an SVG pattern at assets/img/pattern.svg. Provide a unique SVG there for the background pattern.
- No external libraries or fonts are used; all CSS and JS are local and self-contained.
- The contact form is a stub that prevents default submission; wire to your backend or form service where appropriate.
- The modal respects prefers-reduced-motion and disables scale animations when reduced motion is detected.

Accessibility:
- Modal sets aria-modal and keyboard ESC to close.
- Controls use semantic elements and labels.

Safety:
- Contraindications list is included for responsible guidance. Update as needed for your practice and legal requirements.

Customization suggestions:
- Replace color variables in :root to fit brand palette.
- Swap CTA phrasing by changing placeholders for PRIMARY_CTA_LABEL and PRIMARY_CTA_URL.
- Extend the guided exercise sequences by modifying the sequence arrays in the script.
