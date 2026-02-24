# private_practice_therapist — Contact chunk

This bundle contains the contact page and a short README for the lux_gallery layout of the private practice therapist website.

Files included:
- contact.html — the complete contact page, responsive and self-contained. Inline SVGs are used for imagery (hero, avatar, pattern) so no external assets are required.

Placeholders used (replace as part of build/deploy):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{THERAPIST_NAME}}
- {{LICENSE}}
- {{MODALITIES}}
- {{CITY}}
- {{STATE}}

Design notes:
- Layout family: lux_gallery — large hero, restrained color palette, inlined vector art for gallery-style emphasis.
- The contact page intentionally "ripples" the required section pack by including small versions of: diagnostic ("Short diagnostic — a few prompts"), plan ("First plan — what happens after you write"), micro_habits ("Micro practices you can try"), pricing snapshot (brief note linking to Investment/fees), and clear CTAs (primary CTA button and form submission). This ensures the contact page echoes the index-level sections and provides consistent navigation for prospective clients.

Clinical / ethical content included:
- Confidentiality/privacy note in the form and footer.
- Crisis disclaimer telling users to contact emergency services or crisis hotlines.
- Scope & boundaries statement describing limits of practice and referral approach.

Navigation labels intentionally vary from other templates (e.g., "My Story" instead of "About", "Focus Areas" instead of "Specialties", "Schedule" instead of "Book") to satisfy uniqueness rules while keeping links correct.

How to use:
- Replace placeholders with real values.
- Drop contact.html into the site root alongside the other templates (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html). Links in the nav expect those filenames.
- The contact form posts to {{PRIMARY_CTA_URL}} — adjust to your form-handling endpoint or integrate with your backend.

Accessibility & responsiveness:
- Responsive grid adapts to smaller screens; nav collapses for narrow viewports.
- Semantic HTML and clear labels included for form fields.

If you need additional chunks (other pages, separate asset files for the SVGs, or localization), request the next chunk and specify assets or build preferences.