# Contact Page — sound_bath (chunk 4)

This bundle contains the contact page HTML for the sound bath site.

Files included:
- contact.html — self-contained contact page with inline CSS, SVG pattern, and minimal JS for form interactions.

Placeholders to replace in your deployment:
- {{BUSINESS_NAME}} — your studio or project name
- {{TAGLINE}} — (not used on this page but available globally)
- {{PHONE}} — phone number for click-to-call
- {{EMAIL}} — contact email address
- {{PRIMARY_CTA_LABEL}} — label for main action button (e.g., "Request Session")
- {{PRIMARY_CTA_URL}} — URL for primary CTA (book page)
- {{CITY}} — city where sessions take place
- {{STATE}} — state
- {{FACILITATOR_NAME}} — facilitator's name
- {{VENUE_NAME}} — venue for events
- {{NEXT_EVENT_DATE}} — (not used here but available site-wide)

Notes & implementation guidance:
- The page is designed with an "earthy_warm" palette and a "playful_premium" voice. The copy mentions what to bring, contraindications, and the session flow per the sound bath content rules.
- The form is a front-end stub that simulates submission. In production, wire the form to your serverless function or API endpoint and replace the simulated behavior.
- The visual motif uses an inline SVG pattern. The full project also includes a shared pattern at assets/img/pattern.svg (generate per project needs) — this page includes its own embedded SVG to ensure visual richness without external assets.
- Navigation labels are intentionally varied from other pages ("Gatherings", "Upcoming", "Privates", "Rates", "Reserve") to meet uniqueness requirements.

Accessibility & legal:
- There is a clear contraindications disclaimer. This page is not a substitute for medical advice — include a link to full terms or medical disclaimer if required by your organization.

Responsive behavior:
- The layout collapses to a single-column stack under 980px viewport width. The contact card becomes part of the flow instead of sticky positioning.

License & attribution:
- This file is produced as part of a multi-page site generator. Replace placeholder tokens and wire form endpoints as needed.

Enjoy building your sound bath experience!