Contact page and usage notes

This chunk includes the contact page template for the Private Practice Therapist site and a README describing placeholders and important clinical notes.

Files included
- contact.html — the contact/connect page. Uses an earthy, warm layout with organic shapes, friendly cards, and evidence-informed voice.

Placeholders to replace
- {{BUSINESS_NAME}} — your practice/business name
- {{TAGLINE}} — short descriptor
- {{PHONE}} — main phone number, formatted for tel: links
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — primary call-to-action label (e.g., "Request a consult")
- {{PRIMARY_CTA_URL}} — URL or endpoint where the contact form posts or booking link
- {{THERAPIST_NAME}} — clinician's name (displayed in logo/avatar)
- {{LICENSE}} — clinician license (e.g., "LCSW", "LMFT")
- {{MODALITIES}} — brief modalities (e.g., "CBT, EMDR-informed, relational")
- {{CITY}} — city of practice
- {{STATE}} — state of licensure

Design notes
- Layout family: earthy_warm — warm palette, rounded cards, and subtle gradients.
- Voice: scientist_guide — calm, evidence-informed, guiding tone.
- Program model: membership referenced (continuity membership option) — wording is intentionally non-prescriptive.

Clinical & legal notes included in template
- Confidentiality/privacy note on the form and footer.
- Crisis disclaimer instructing users to contact emergency services in a crisis.
- Scope information noting limits (no medication management, referrals available).

Development notes
- The contact form posts to {{PRIMARY_CTA_URL}}. Update method/action as needed for your backend or replace with direct mailto: link if not using a form handler.
- The page uses inline SVGs for the avatar and small decorative elements to avoid external assets. If you prefer separate asset files, extract the inline SVG markup into assets/img/*.svg and update references.
- Navigation links point to other site pages (index.html, about.html, specialties.html, approach.html, book.html). Ensure those files exist and adapt nav labels as needed.

Accessibility & privacy
- The form fields include accessible label associations and clear placeholders. Consider adding ARIA attributes and server-side validation.
- Email is not fully secure; the template explicitly notifies users. For higher privacy needs, implement secure intake (encrypted forms or portal) and note that option in messaging.

Customization ideas
- Swap the logo square for an SVG file if you have a brand mark.
- Customize colors in the :root CSS variables to match brand palette.
- Expand FAQs on a dedicated faq.html to cover membership details, session lengths, cancellation policies, and billing.

Contact
- If you need a variant of this page (simple landing, booking-only, or membership-focused), request an alternate layout and I will create a matching file with distinct headings and metaphors to keep pages unique.
