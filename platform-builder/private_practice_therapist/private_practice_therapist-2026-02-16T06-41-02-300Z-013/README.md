# Contact page and instructions for {{BUSINESS_NAME}}

This chunk provides the contact page (contact.html) for a private practice therapist site using the "zen_minimal" layout and a calm, teacher-like voice.

Files included in this chunk:
- contact.html — the full contact page with hero, diagnostic (intake checklist), plan (what happens next), micro_habits (small practices), pricing summary, and CTA sections clearly present.

Purpose and structure
- The contact page is intentionally spare and focused: gentle hero, a short intake form, clear next steps, practical micro-habits, and a concise framing of fees.
- Navigation links point to the rest of the site (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html).
- The page includes confidentiality, crisis disclaimer, and scope/boundaries language required for ethical practice.

Placeholders
- Replace placeholders in the content where appropriate:
  - {{BUSINESS_NAME}} — practice or business name
  - {{TAGLINE}} — brief tagline or descriptor
  - {{PHONE}} — primary phone number for contact
  - {{EMAIL}} — contact email address
  - {{PRIMARY_CTA_LABEL}} — label for primary call-to-action (e.g., "Request consult")
  - {{PRIMARY_CTA_URL}} — URL or endpoint for form/CTA
  - {{THERAPIST_NAME}} — clinician name
  - {{LICENSE}} — licensing credential and state (e.g., LCSW, LMFT)
  - {{MODALITIES}} — brief list of modalities (e.g., EMDR, somatic, CBT-informed)
  - {{CITY}}, {{STATE}} — practice location

Design notes
- Layout is intentionally minimal with ample white space and a gentle color palette.
- No external assets or third-party scripts are included. Replace or add local assets if desired.
- The contact form in this demo uses a non-functional onsubmit handler for safe preview. Hook up your backend or form processor at {{PRIMARY_CTA_URL}}.

Accessibility & content guidance
- Maintain the concise crisis disclaimer and confidentiality note. These are important for both ethics and client safety.
- Avoid making guarantees about outcomes or medical claims; language is supportive and realistic.
- Keep the tone calm and grounded to match the spiritual_teacher voice while remaining clinically appropriate.

Deployment
- Drop contact.html into the site root alongside the other templates (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html).
- Ensure links to assets (assets/img/*.svg) exist if other chunks include or reference them.

Customization tips
- Adjust the micro_habits list to reflect simple practices you actually recommend.
- Expand the pricing summary on fees.html; the contact page intentionally remains a short summary and referral point to the Fees page.
- If you will accept clients only in certain jurisdictions, make that explicit next to licensing and telehealth notes.

Legal reminder
- This page is not legal advice. Confirm disclaimers with your professional board or legal counsel as needed.

If you need updates to the copy tone, alternative CTA labels, or a different micro-habits set, request another revision and specify which placeholders to populate.