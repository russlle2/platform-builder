This chunk contains two files for the aromatherapy site template (layoutFamily=zen_minimal, voice=minimal_poetic).

Files:
- contact.html — Contact & intake page with required sections: hero, diagnostic, plan, micro_habits, pricing, cta. Includes an accessible contact form, client-side validation, and a decorative inline SVG pattern for visual richness (no external assets required here).

Placeholders to replace as needed:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}}

Notes and integration:
- The contact form is static for the prototype: it validates client-side, logs the payload to the console, and shows a confirmation message. Hook the form to your backend or a form service if you need submissions persisted.
- Safety-forward copy is included: prompts for pregnancy, pets, and patch-test acknowledgement. Do not add medical claims in other pages.
- A unique SVG decorative pattern is embedded in contact.html. If a shared asset (assets/img/pattern.svg) is desired, replace the inline SVG with that file and update references across templates.
- Nav labels are intentionally varied and minimal; ensure consistency across other pages when you assemble the full site.

Styling:
- Self-contained CSS is in contact.html. Visual richness uses gradients, soft shadows, and the inline SVG pattern. No external fonts or CDNs are used.

Customization tips:
- Adjust pricing card numbers in the hero aside to match your current fees.
- Update the events series language in the plan section to reflect your offerModel and schedule.
- Keep language safety-first: recommend dilution, patch testing, and consultation for pregnancy or pet-related concerns.

If you need the complementary asset files (index.html, services.html, blends.html, shop.html, pricing.html, about.html, book.html, and assets/img/pattern.svg), request the remaining chunks and they will be produced with distinct headings, varied metaphors, and unique section orders to satisfy uniqueness requirements.