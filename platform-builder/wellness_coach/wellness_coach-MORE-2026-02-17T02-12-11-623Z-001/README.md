Project: wellness_coach (zen_minimal layout)

Description:
A minimal, poetic wellness coach site focused on habits, frameworks, and measurable outcomes. This chunk contains the contact page and documentation.

Files in this bundle:
- contact.html  — Contact page with interactive Session Planner and 7-day Habit Builder.
- README.md     — This file.

Pages in the full site (other pages expected in the project):
- index.html
- about.html
- services.html
- programs.html
- pricing.html
- testimonials.html
- book.html
- contact.html

Placeholders (replace in deployment):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented on contact.html:
- Contact form (local stub) using handleContact(event). Replace with a real endpoint or form handler for production.
- Session Planner widget: buildPlan() composes a short plaintext session blueprint and shows it in the UI. copyPlan() and downloadPlan() let users copy or download the summary.
- Habit Builder (7-day challenge): generateHabit() makes a simple printable checklist, stored as plaintext. copyHabit(), printHabit(), and downloadHabit() provide export and print actions.
- Print-friendly output for the checklist opens a new window with a clean print view.

Design notes:
- No external assets or CDNs. The page references an SVG pattern at assets/img/pattern.svg for decorative background; ensure a unique SVG is included in that path for the full project.
- Navigation labels differ from standard templates (Home, Philosophy, Offerings, Journeys, Investment, Stories, Book a Session, Connect).
- Language intentionally avoids medical claims and focuses on habits, frameworks, and outcomes.

Developer notes:
- The contact form currently alerts and resets on submit. Hook handleContact to your server or third-party form processor before going live.
- Copy uses navigator.clipboard; some older browsers may require fallback selection and execCommand.
- Printing opens a new window to ensure the printed content is isolated. Ensure pop-ups are allowed in the environment.
- All interactive behavior is implemented with vanilla JS for portability.

How to test locally:
1. Place this file and the rest of the site files in a folder.
2. Add a unique SVG at assets/img/pattern.svg to complete the visual.
3. Open contact.html in a browser. Try:
   - Building a session plan and copying/downloading it.
   - Generating a 7-day challenge, copying, printing, and downloading the checklist.
   - Submitting the contact form to see the local stub behavior.

Accessibility & print:
- Plain text outputs are in monospace containers for easy copying and legibility.
- Print stylesheet targets the printed checklist via window.open() content.

License: replace with your preferred licensing and credits.

Notes: This chunk is tailored for the wellness_coach niche with a hybrid offer model and a minimal poetic voice. Replace placeholders with real business data before publishing.