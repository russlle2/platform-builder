Project chunk: contact (chunk 4)

Files included:
- contact.html : Contact page with an interactive "Session Planner" widget and scroll-triggered reveals.
- README.md : This file.

Purpose:
This chunk contains the contact page for the wellness coach site. It is designed to be a standalone static HTML page that integrates with the rest of the site (other pages: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html).

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used directly on this page, included site-wide)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design notes and features:
- Layout: split diagonal-inspired look via a two-column grid; right column uses a local SVG pattern referenced at assets/img/pattern.svg (ensure that asset exists in the final bundle).
- Navigation uses a distinct label set (Home, Approach, Offerings, Programs, Invest, Stories, Book) and links to the correct pages.
- Unique voice: direct, executive, concise phrasing tailored to a VIP Day offering focused on outcomes, habits, and frameworks.
- Accessibility: forms use labels; status regions use aria-live for messaging; keyboard-accessible controls.
- No external assets, fonts, or CDNs referenced.

Interactive behaviors (implemented with local JS):
1) Scroll-triggered section reveal
   - Uses IntersectionObserver to add a "revealed" class when sections with the .reveal class enter view.
   - Respects prefers-reduced-motion: if the user prefers reduced motion, reveals are applied immediately and transitions are disabled.

2) Session Planner widget
   - Local interactive form that builds a plaintext session plan summary based on user inputs (outcome, duration, focus, approach, prep notes).
   - The plan is displayed in a preformatted block and can be copied to clipboard with a Copy button.
   - Also supports downloading the plan as session-plan.txt.
   - Accessible feedback via aria-live status nodes.

Contact form behavior:
- The contact form is intentionally local-only (no backend). Submitting the form prevents default submission and creates a short summary that shows a local status message. The user can use the planner copy functionality as a convenient way to move content into an email.

Styling:
- Uses modern CSS variables, a dark theme, and a diagonal split visual implemented via grid and an SVG pattern background.
- Reveal animations use transform and opacity with a gentle timing curve. Reduced-motion users see a static presentation.

Developer notes:
- Ensure the asset assets/img/pattern.svg is present in the overall project; the CSS in contact.html references it directly.
- This chunk intentionally does not provide any backend wiring for the contact form. For production, hook the form to a server endpoint or a mail service.
- The JavaScript contains fallbacks for clipboard operations when navigator.clipboard is unavailable.

Testing locally:
1) Place this file into your site root alongside the other pages.
2) Open contact.html in a browser. No server required for basic functionality.
3) Test the Session Planner: fill fields, click "Build plan", then "Copy plan" and paste into a text editor to verify.
4) Toggle OS-level "Reduce Motion" and reload the page to confirm reveal animations are disabled.

Notes on uniqueness and constraints:
- Copy avoids previously flagged taglines and phrases.
- This page emphasizes outcomes + habits + frameworks without making medical claims.
- Navigation labels and CTAs are divergent from other templates to meet uniqueness requirements.

If you need further chunks (assets, index, about, services, etc.), request the specific chunk and this project ID/slug to continue assembling the site.