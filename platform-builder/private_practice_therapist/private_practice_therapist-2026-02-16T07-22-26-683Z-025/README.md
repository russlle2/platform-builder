This chunk contains the contact page and a short README for the private practice therapist site.

Files included:
- contact.html — Contact & intake form, practitioner contact details, confidentiality and crisis disclaimers, links to required site sections (diagnostic, plan, micro_habits, pricing) so the required section pack clearly ripples across pages.

Placeholders used (keep them in the global build or replace at deploy time):
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
- layoutFamily: clinic_modern (clean grid, calm palette, precise components).
- voiceFamily: spiritual_teacher — tone is reflective, grounding, professional.
- programModel: cohort referenced where relevant (session types include cohort programs).

Clinical & legal notes included on the page:
- Confidentiality & limits of care statement.
- Crisis disclaimer instructing to use emergency resources for imminent risk.
- Scope note about referrals if not a good fit.

Integration:
- The contact form posts to {{PRIMARY_CTA_URL}}. Adjust action to your server or form handler.
- Navigation links point to other pages in this project (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html). Ensure those files exist in the final build.

Accessibility:
- Form inputs include labels and basic ARIA-friendly structure.
- Keep contact methods available for people who prefer phone over electronic messaging.

If you are assembling other chunks, ensure the assets (SVGs and shared styles) referenced across pages are provided in their respective chunks. This chunk intentionally avoids external fonts, scripts, or CDNs.