This chunk contains two files for the holistic_medicine site (slug: holistic_medicine-MORE-2026-02-17T18-29-14-227Z-009).

Files included:

- contact.html
  - Purpose: Contact and intake page with two interactive features built in plain HTML/CSS/JS.
  - Features implemented:
    - Timeline planner: three phases (Stabilize, Establish, Integrate). Users can adjust weeks per phase via range inputs; the UI summarizes total plan length and suggested check-ins. A snapshot button copies the summary to clipboard. Clear disclaimer: educational tool only, not medical advice.
    - Proof Gallery: rotating testimonials and credibility badges. Testimonials auto-rotate and have manual Prev/Next controls. Badges show brief tooltips on hover. Testimonials include the {{CITY}} placeholder.
    - Contact form: local handling that validates name and consent, then opens an email draft to {{EMAIL}}. Includes phone and email placeholders: {{PHONE}}, {{EMAIL}}.
    - Navigation uses an alternate label set: Start, Offerings, Concerns, Path, Rates, Team, Reserve, Connect.
    - CTA button wired to {{PRIMARY_CTA_URL}} and labeled with {{PRIMARY_CTA_LABEL}}.
  - Accessibility: labels and ARIA where appropriate; tooltips are simple and visible on hover.
  - Legal: explicit disclaimers for planning tool and testimonials; encourages urgent care via emergency services.

- README.md (this file)
  - Explains contents and usage notes.

Placeholders present in contact.html (do not replace here — intended for template processing):
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}

Notes for developers/designers:
  - The page references assets/img/pattern.svg for a subtle background motif. Ensure the project includes a unique SVG at that path.
  - No external fonts or CDNs used; keep assets local.
  - Copy is intentionally cautious and educational in tone; avoid making cure or outcome guarantees.
  - The timeline planner is a lightweight client-side tool intended for planning discussions; keep server-side validation and formal intake separate.

If you need a separate JS module or additional analytics, extract inline scripts into a local file and load it from the bundle root.
