Contact page and usage notes for private_practice_therapist project

Files in this chunk:
- contact.html — Full contact page with an interactive "Session Planner" widget and progressive reveal behaviour.

Key features implemented here:
- Session Planner: a small client-side tool that builds a plaintext plan from your short answers. It supports copying to clipboard and downloading a .txt file.
- Scroll-triggered reveal animations: sections with the class "reveal" animate into view using IntersectionObserver. The script respects users who prefer reduced motion (prefers-reduced-motion) and disables the animation for them.
- Accessibility considerations: aria labels, role for dynamic result region, and reduced-motion respect.
- Visual design: split/diagonal header (via clip-path) and page-pattern background pointing to assets/img/pattern.svg (create a local SVG at that path). No external resources are required.

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Therapist & legal notes included on the page:
- Confidentiality statement and limits
- Scope boundaries and that this is not emergency care
- Encouragement to contact emergency services if in crisis

How to test locally:
1. Place this file alongside the other pages of the site (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html).
2. Create the SVG pattern at assets/img/pattern.svg. The HTML references it as a background. You can create a simple SVG pattern (e.g., geometric dots or diagonal lines) at that path.
3. Serve the folder with a simple static server. For example, using Python 3:
   python -m http.server 8000
   Then open http://localhost:8000/contact.html

Notes and maintenance:
- The Session Planner only creates a plaintext summary for planning and sharing; it does not submit data to a server and does not record anything permanently. It’s meant as a tool to prepare for intake.
- Avoid adding medical claims anywhere in the site. All clinical language should be supportive, grounded, and avoid guarantees.
- The page assumes other site pages exist with the standard filenames. Ensure nav links are preserved if you rename files.

If you need a ready example SVG for assets/img/pattern.svg, create one with repeating shapes or a subtle grid so it matches the design without external assets.