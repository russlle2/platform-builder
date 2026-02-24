Contact page and notes for chunk: holistic_medicine-MORE-2026-02-17T20-38-51-126Z-033

What is included
- contact.html — a standalone contact + planning page for {{BUSINESS_NAME}}.

Purpose and features
- Minimal, poetic interface tuned for holistic / integrative medicine practices.
- Interactive timeline planner (three phases) with sliders to sketch a roadmap and an "Export sketch" action that copies a short summary to the clipboard. Includes a clear disclaimer about clinical decisions.
- Proof Gallery: rotating testimonials with Prev/Next controls and credibility badges. Badges show short tooltips on hover and click.
- Contact form (mock) that validates minimal fields and simulates sending a request; suitable to wire into server endpoints later.
- Sidebar micro-habits, program names, and pricing framing designed to differ from other templates.

Design notes
- No external assets or CDNs are used. A bespoke inline SVG pattern provides visual texture (serves as the pattern that would otherwise live at assets/img/pattern.svg).
- The page uses a compact, two-column layout on wide screens and stacks on small screens.
- Navigation uses a distinct label set: Start, Offerings, Ailments, Method, Investment, About, Book, Connect — linking to the correct filenames.

Accessibility & compliance
- The planner and gallery include accessible labels and live-region updates for small interactions.
- Disclaimers are present: the planner is explicitly a planning tool and not medical advice.

Integration
- Replace placeholders: {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- To connect the contact form to a backend: attach a submit handler to contactForm that performs a POST to your endpoint and handle success/error accordingly.

Notes for maintainers
- The inline SVG pattern is intentionally unique. If you prefer a separate file, extract the <svg> content into assets/img/pattern.svg and update .pattern-wrap to reference it as a background image.
- The testimonial rotation and badge tooltips are simple and light; consider replacing alert() with UI to show form submission confirmations for production.

Chunk id: holistic_medicine-MORE-2026-02-17T20-38-51-126Z-033
Seed: 4254056154
Layout family: lux_gallery
Voice: minimal_poetic
Offer model: hybrid