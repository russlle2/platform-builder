# Contact — {{BUSINESS_NAME}} (Site chunk)

This chunk includes the contact page and a brief README describing the interactive planning tools.

Files:
- contact.html — Contact + Session Planner + Whole-Person Inventory widget.

Key features in contact.html:
- Header and nav with alternate labels: Home, Offerings, Conditions, Method, Investment, Who We Are, Sessions, Connect.
- Session Planner: lets a visitor select focus areas, enter basic goals, choose session count/length/intensity, and then builds a plaintext plan with suggested agenda, time allocations, interventions, and follow-up cadence.
- Copy button exports the generated plaintext summary to the clipboard for sharing or saving.
- Whole-Person Inventory: fast checklist that drafts a consultation agenda and recommended follow-up cadence; also has a copy button.
- Educational disclaimer (no guaranteed cures, not a substitute for clinical assessment).
- Uses a subtle patterned backdrop referencing /assets/img/pattern.svg (local asset expected elsewhere in the bundle).

Placeholders to replace in templates:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Design notes:
- Tone is exploratory and pragmatic; the widget is designed for quick preparation before an intake.
- The clipboard copy uses the Clipboard API; the page provides alerts for success/failure.
- No external fonts or CDN usage.

Integration:
- Ensure the rest of the site pages referenced by the nav exist in the same root (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html).
- Include a local SVG pattern at /assets/img/pattern.svg for background texture (unique pattern for this project).

Accessibility & behavior:
- Inputs are keyboard accessible; Enter in the name field triggers plan build.
- Generated outputs are placed in a pre-wrapped text area with aria-live="polite" for screen reader updates.

License: internal use for {{BUSINESS_NAME}} site build.