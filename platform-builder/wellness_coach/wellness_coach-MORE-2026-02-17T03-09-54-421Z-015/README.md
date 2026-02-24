Contact page for the wellness coach site (layoutFamily: aura_editorial).

Files in this bundle:
- contact.html — Contact page with two interactive tools and contact form placeholders.

Placeholders to replace in your build process (do not remove):
- {{BUSINESS_NAME}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Interactive features included directly in contact.html:
- Session Planner
  - Enter a name (optional), session duration, focus area and frequency.
  - "Create plan text" builds a plain-text session plan in the editable preview.
  - "Copy summary" copies the plaintext plan to the clipboard for use in notes or messaging.
  - The CTA button links to {{PRIMARY_CTA_URL}} and displays {{PRIMARY_CTA_LABEL}}.

- 7‑Day Habit Challenge
  - Enter a habit name and select intensity (Gentle / Steady / Bold).
  - "Generate checklist" builds a 7-day checkbox list and short tips.
  - "Print checklist" triggers the browser print dialog and prints only the checklist area.

Other notes:
- Navigation uses an alternate label set: Home, Who I Help, Offerings, Lab, Rates, Praise, Book, Connect.
- No external assets or CDNs are used. Visual accents are made with inline SVG and CSS.
- The contact form uses a simple JS handler that prevents default submission; wire this to your backend or form handler as needed.
- Memberships and offerings are referenced generally (outcomes, habits, frameworks only), with no medical claims.

Integration tips:
- Replace placeholders with your brand, contact and CTA values.
- To wire the contact form, replace the onsubmit handler with your AJAX or form action.
- The planner and checklist are client-side tools; persist data for users by connecting to your membership backend if desired.

If you need the SVG pattern as a separate file (assets/img/pattern.svg) to reuse across the site, extract the <svg> block at the top of contact.html into that file and update styles to load it where needed.