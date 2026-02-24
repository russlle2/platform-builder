# wellness_coach — zen_minimal (chunk 4)

Project seed: 673089635
Layout family: zen_minimal
Voice: executive_coach
Program model: intensive

This bundle contains the contact page and a README. The full site includes the following pages (links used across navigation):
- index.html
- about.html
- services.html
- programs.html
- pricing.html
- testimonials.html
- book.html
- contact.html  <-- present in this chunk

Design intent
- A very clean, spacious "zen minimal" aesthetic.
- Focused copy that emphasizes outcomes, frameworks, and habit-based progress.
- The contact page contains condensed versions of the required section pack so these elements ripple across the site:
  - hero, values, methods, objections, testimonials, lead_magnet, cta

Placeholders used
- Replace these placeholders across files when publishing:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{COACH_NAME}}
  - {{CREDENTIALS}}
  - {{CITY}}
  - {{STATE}}

Contact page specifics
- File: contact.html
- Contains:
  - Compact hero with direct booking CTA
  - Core commitments (values)
  - Methods (framework descriptions)
  - Objections (common concerns)
  - Testimonials (short quotes)
  - Lead magnet form (email-only, client-side)
  - Primary contact form that opens mail client for lightweight deployments

Integration notes
- No external assets, fonts or CDNs are referenced in this chunk.
- The forms are intentionally lightweight: the lead-magnet form demonstrates a client-side UX placeholder; integrate with your email provider or CRM for production delivery.
- Navigation labels vary from other pages deliberately (e.g., "Philosophy" vs "About", "Work With Me" vs "Programs"). Ensure the link targets match the actual filenames in your project.

Production checklist
- Replace placeholders with real values.
- Hook lead magnet to an email provider (Mailchimp/ConvertKit/Segment) or server endpoint.
- Implement server-side form handling or a third-party form processor if you need to capture leads without relying on mail clients.
- Add assets and unique SVG files into assets/img/ as required by the full build (hero.svg, avatar.svg, pattern.svg) in other chunks.

Accessibility & privacy
- Forms use basic required fields; add server-side validation and a privacy notice before collecting personal data.
- Keep copy outcome-focused and avoid medical claims.

If you want the next chunk, I will generate the remaining pages and the local SVG assets according to the project rules.