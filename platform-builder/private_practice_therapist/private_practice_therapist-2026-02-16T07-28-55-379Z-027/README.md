Contact page for the private practice therapist template (chunk 4)

Files included in this bundle:
- contact.html — The full contact page for the site. Contains: hero, values, methods, objections, testimonials, lead_magnet, and call-to-action sections as required.

Placeholders used (replace or programmatically inject):
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

Notes and integration guidance:
- This chunk intentionally references local SVG assets: assets/img/avatar.svg and assets/img/pattern.svg and assets/img/hero.svg (hero.svg referenced in other pages). Ensure those files are present in the assets/img directory when assembling the full site.
- The contact page uses a mailto form as a lightweight lead-magnet submit. Replace with a backend endpoint or embed form handling as needed.
- Navigation links reference the other pages in the site: index.html, about.html, specialties.html, approach.html, book.html, contact.html — keep filenames consistent.
- Legal text included: a concise confidentiality/privacy note, crisis disclaimer, and scope/boundaries statement. These are written to be ethically grounded; adapt to local/regulatory requirements and your licensing rules.

Styling and design:
- The page follows the "bold_playful" layout family: bright accent colors, rounded cards, lively CTAs. All styles are inline in the head for portability and to avoid external dependencies.
- No external fonts, analytics, or CDNs are included.

Accessibility and behavior:
- Headings use semantic tags and aria-labelledby for clarity.
- Form uses a basic mailto fallback. If implementing a scripted or server-side form, ensure proper validation and privacy/security measures.

Developer tips:
- Replace placeholder text programmatically to personalize before publishing.
- If offering telehealth across states, verify licensure and telehealth rules per state before enabling cross-state booking links.
- Keep testimonial text anonymized unless you have explicit permission to publish identifying details.

End of chunk 4.