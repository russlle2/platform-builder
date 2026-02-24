Contact page and notes for private practice therapist template (chunk 4)

Files included in this bundle:
- contact.html  : Contact page with session boundaries accordion, rotating Proof Gallery, credibility badges with tooltips, and a short contact form.

Purpose and features:
- Session boundaries + confidentiality accordion: clearly states session length, cancellation expectations, confidentiality limits, and scope of practice. Includes a respectful crisis footer with emergency guidance (not a replacement for emergency services).
- Proof Gallery: rotates three short testimonials (local JS) and displays credibility badges; badges reveal tooltips on hover or keyboard focus for accessible microcopy.
- Form behavior is local-only and demonstrates validation and polite confirmation. It does not transmit data to any server.
- Navigation uses an alternate label set to keep the site distinct.
- Placeholders present for site-wide substitution: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Implementation notes:
- No external assets, fonts, or CDNs are used. Visual interest is implemented via CSS and an inline SVG pattern.
- This page expects other pages (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html) to be present at the same site root.
- Accessibility: tooltips are available on hover and keyboard focus; badges are reachable via Tab and toggled with Enter/Space.

How to test locally:
1. Put this file in the same folder as the other template HTML files.
2. Open contact.html in a browser.
3. Test testimonials rotating and pausing on hover, accordion toggle, and form submission (which is simulated via alert).

Therapist-specific guidance included in the content:
- Clear, non-medical language describing confidentiality, limits of practice, and referral pathways.
- Explicit crisis guidance pointing users to emergency services and official hotlines; the site does not provide crisis intervention.

If you need an alternate phrasing for any section, or want the contact form wired to a real backend (with secure transmission and proper consent flow), tell me what stack you plan to use and I will prepare a secure implementation guide.