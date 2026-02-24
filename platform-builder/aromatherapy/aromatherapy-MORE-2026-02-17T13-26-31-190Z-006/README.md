Project: aromatherapy-MORE-2026-02-17T13-26-31-190Z-006 (layoutFamily: zen_minimal)

Overview:
- This chunk provides the contact/Connect page for an aromatherapy practitioner site and a README with notes for maintainers.
- Files included in this bundle: contact.html, README.md
- The contact page emphasizes safety-forward language (use of "may support") and includes an in-browser guided micro-practice modal (breathing / journaling / intention setting) implemented with vanilla JS.

Placeholders to replace:
- {{BUSINESS_NAME}} — business or practitioner name
- {{TAGLINE}} — not used on this page but present in the project template
- {{PHONE}} — phone number (used in links)
- {{EMAIL}} — contact email (used in mailto links)
- {{PRIMARY_CTA_LABEL}} — CTA label shown in the header
- {{PRIMARY_CTA_URL}} — CTA URL (header)
- {{CITY}} and {{STATE}} — used in footer and location copy

Design & behavior notes:
- No external fonts or CDNs used.
- Visual pattern referenced at assets/img/pattern.svg (background subtle pattern). Ensure a unique SVG is placed there elsewhere in the project.
- Navigation labels differ: Begin, Gatherings, Blends, Boutique, Invest, About, Book, Connect. Links point to the corresponding HTML files in the overall site.

Accessibility & progressive enhancement:
- Modal uses aria-modal="true" and is keyboard dismissible (Escape) and dismisses on backdrop click.
- Controls are focusable and announced when switched. Live regions are used for micro-practice guidance.
- Scroll-triggered reveals use IntersectionObserver. If the user prefers reduced motion (prefers-reduced-motion:reduce), reveals are applied immediately without animation.
- The breathing visual respects prefers-reduced-motion by bypassing transform animations if reduced motion is requested.

Micro-practice details:
- Three modes available in the modal: Breathing, Journaling, Intention.
- Breathing: a simple timed sequence that walks through inhale/hold/exhale/hold. No claims are made; wording follows "may support" patterns elsewhere on the site.
- Journaling: short prompt, saved locally to localStorage (key: microjournal_v1). Data stays in the user’s browser.
- Intention: short phrase saved to localStorage (key: microintention_v1) with clear capability.

FAQ / Safety copy (included on page):
- Dilution: recommends following dilution guidance.
- Patch test: recommends patch testing.
- Pets: advises caution and consultation with a veterinarian.
- Pregnancy & nursing: advises consulting a qualified health professional.
- IMPORTANT: No medical claims are present.

Developer notes:
- Contact form currently prevents default submission in this demo and shows an alert. Replace the onsubmit handler with integration to your chosen backend or form handler.
- The assets/img/pattern.svg file should be placed in the assets/img/ directory. Provide a unique SVG pattern for this project to meet uniqueness requirements.
- Reveal thresholds, transition timing, and breathing phase lengths can be tuned in the inline JS and CSS.

Where to edit further:
- Header CTAs and nav labels: in contact.html header nav area.
- Micro-practice wording and timings: inline <script> near the bottom of contact.html.
- Accessibility augmentations: consider adding focus trapping inside the modal for a stricter a11y experience.

License & usage:
- This template is provided as-is for use in constructing a minimal static site for an aromatherapy practitioner. Ensure local legal and safety copy is verified by relevant professionals where required.