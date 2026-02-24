# Contact — {{BUSINESS_NAME}} (zen_minimal)

This folder contains the contact page and notes for the wellness coach site built with a calm, clinical tone and minimalist layout.

Files included:
- contact.html — the main contact page with two interactive tools: a 7-day habit builder and a guided-exercise modal (breathing, journaling, intention). The page includes a contact form and links to other pages in the site.

How to use the interactive features:
- Habit builder
  - Enter a concise habit name and choose intensity.
  - Click "Create week" to generate a 7-day checklist with checkboxes.
  - Use "Print checklist" to print a focused checklist (UI is hidden for printing).
  - "Download" saves a plain-text checklist for offline use.

- Guided exercise modal
  - Open any exercise using the buttons: Breathing, Journaling, or Intention.
  - Breathing: a simple paced visual with scale changes and labels for inhale/hold/exhale cycles (approx. 2 minutes by default).
  - Journaling: a 3-minute prompt with a text area; auto-timer ends the session.
  - Intention: quick one-line intention saved to sessionStorage for the current browser session.

Accessibility and behavior notes:
- No external assets or CDNs are required. The page references an SVG pattern at assets/img/pattern.svg in CSS (included in other chunks of the project).
- The contact form is a simulated local experience (it shows confirmation and redirects to {{PRIMARY_CTA_URL}}) to remain a static-friendly implementation.
- The design uses unobtrusive ARIA roles on the modal and keyboard focus returns to the page when closed.

Placeholders to replace in production:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Developer notes:
- This page avoids repeating recent headline phrases and uses a unique nav label set.
- Scripts are plain vanilla JS—no libraries—to keep the bundle lightweight and static-host friendly.
- The habit builder and guided exercises are intentionally minimal, focusing on repeatable micro-practices and outcomes rather than medical advice.

If you need the complementary assets (pattern.svg) or other pages (index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html), they are provided in other chunks of the project.