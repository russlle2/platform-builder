# {{BUSINESS_NAME}} — Static Site (Aromatherapy)

This repository contains a small editorial-style static site for an aromatherapy practitioner. The design is minimal-poetic, safety-forward, and optimized for event-series offerings.

Files in this chunk:
- contact.html — contact, booking form, event series overview, safety notes, testimonials, pricing snapshot

Other pages in the project (should exist elsewhere in the bundle):
- index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html

Placeholders to replace (global):
- {{BUSINESS_NAME}} — your business name
- {{TAGLINE}} — short descriptive line
- {{PHONE}} — contact number
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — primary call to action label (e.g. "Reserve a Spot")
- {{PRIMARY_CTA_URL}} — primary CTA URL (used on other pages)
- {{CITY}} / {{STATE}} — location
- {{PRACTITIONER_NAME}} — practitioner
- {{FAVORITE_BLEND}} — used on blends or shop pages

Design notes
- The page uses a local SVG at assets/img/pattern.svg as a decorative background. Create a unique, accessible SVG there (abstract botanical pattern, subtle) and avoid external CDNs.
- Visual richness is achieved through CSS gradients, subtle shadows, and the SVG pattern — no external fonts or images are required.
- Navigation labels vary across templates; this contact page uses "Reach" as a nav label to keep language varied.

Aromatherapy & safety guidance
- Content is intentionally safety-forward. There are no medical claims and the site prompts consultation with healthcare providers where relevant.
- Include clear notes on dilution, patch testing, pregnancy, nursing, and pet safety. The blends and FAQ pages must include fuller dilution guidance and guidelines for vulnerable populations.

Events / offer model
- This build follows an events_series model: workshops, multi-session cohorts, and private consults are surfaced throughout the site. The contact page includes an offer list and a simple booking form to register interest.

Accessibility & privacy
- Forms are simple and use clear labels. Ensure any server handling contact submissions follows privacy best practices (store minimal data; provide response timeline).
- Provide alt-text for images if added later; maintain sufficient color contrast for text and interactive elements.

How to use
1. Replace placeholders in each HTML file with real content.
2. Add the SVG file at assets/img/pattern.svg. Keep the file lightweight and decorative.
3. Hook the contact form to your email or server endpoint; the current form uses client-side validation and a mock submit.
4. Review blends.html and shop.html for product and blend listings; abide by safety-first copy (no therapeutic claims).

Developer tips
- Keep layout elements reusable: cards, tiers, event blocks. They follow a soft editorial rhythm.
- When adding more pages, vary headings and metaphors so each page reads distinctively while keeping consistent visual language.

License & attribution
- This starter is provided as-is for customization. Remove placeholder content and tailor copy for your legal and compliance needs, especially around aromatherapy safety.

If you need a quick checklist before launch:
- [ ] Replace placeholders
- [ ] Create assets/img/pattern.svg
- [ ] Hook form to backend
- [ ] Verify local contact info and business details
- [ ] Confirm pricing & event dates

Thank you for keeping aromatherapy safe and thoughtful. "Less haste, more careful presence." — design note