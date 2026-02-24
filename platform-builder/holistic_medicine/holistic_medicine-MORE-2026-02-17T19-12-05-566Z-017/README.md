Project: holistic_medicine — contact page (chunk 4)

Files in this bundle:
- contact.html  -> Standalone contact page with glass-style UI, rotating proof gallery, and an interactive three-phase timeline planner.
- README.md     -> This file.

Placeholders (replace in your deployment):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented locally (no external services):
- Timeline planner: three phases (Stabilize, Build, Integrate) controlled by range inputs. Shows computed total weeks/months and gentle visual nudges. Includes a disclaimer: the planner is a design tool and not a prescription.
- Proof Gallery: rotating testimonials with manual prev/next controls. Each testimonial displays credibility badges; hovering a badge reveals a tooltip describing the signal.
- Contact form: collects name, email, phone, preferred date, and message. Form is handled client-side (mock submission) and shows a transient confirmation. No back-end wired in this chunk.

Design notes:
- Glass morphism visual language implemented with translucent panels, subtle borders, and glow.
- Decorative SVG pattern is embedded inline to avoid external assets. (Note: other chunks may place an external assets/img/pattern.svg; this page includes its own background SVG for uniqueness.)
- Navigation uses a different label set: Home, Offerings, Conditions, Method, Investment, Team, Schedule, Contact

Accessibility & content:
- No guaranteed cures are stated. The page uses an educational/supportive tone and explicitly notes that information is not a prescription.
- Replace placeholder values before publishing. Links in the top navigation point to the expected pages: index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html

How to test locally:
1. Save contact.html to a folder with the rest of the site, or open it directly in a modern browser.
2. Interact with the timeline sliders; observe totals and visual feedback.
3. Watch the testimonial rotation and hover badges to see tooltips.
4. Submit the contact form (it is a mock — no external network calls).

Notes for integration:
- Replace the mock form handler with an actual API endpoint ({{PRIMARY_CTA_URL}} or similar) in production.
- Ensure placeholders are injected by your templating system before publishing.

License: project content is provided as-is for site assembly and reference.