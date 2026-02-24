# Contact Page — {{BUSINESS_NAME}}

This chunk contains two files:

- contact.html — a complete, self-contained contact page optimized for a private practice therapist. Includes a hero, contact form, therapist card, quick links to the required section pack (story, framework, programs, pricing, testimonials, CTA), and full legal/clinical disclaimers.

What to edit

- Replace placeholders with your practice details:
  - {{BUSINESS_NAME}} — practice or business name
  - {{TAGLINE}} — short tagline
  - {{PHONE}} — main contact number
  - {{EMAIL}} — primary contact email
  - {{PRIMARY_CTA_LABEL}} — primary call-to-action label (e.g., "Book a consult")
  - {{PRIMARY_CTA_URL}} — URL for the primary CTA (e.g., book.html)
  - {{THERAPIST_NAME}} — clinician name
  - {{LICENSE}} — license information (e.g., "LPC #12345")
  - {{MODALITIES}} — primary modalities (e.g., "CBT, EMDR, ACT")
  - {{CITY}} / {{STATE}} — location

Accessibility & notes

- The form uses a simple mailto fallback so this will work on static hosting. For production, replace with a secure server endpoint or integrate with a verified form service that meets privacy expectations.
- The page includes clear confidentiality, crisis, and scope disclaimers required for ethical practice websites. Review these with your clinical supervisor or legal advisor before publishing.
- The design follows the "bold_playful" layout family: vibrant accent color, rounded cards, confident typography. Adjust colors in the <style> block to match your brand.

Behavior

- On submit the form validates minimal fields, opens the visitor's mail client with a prefilled message, and displays a short success note. This is an intentional lightweight approach for static sites and to avoid collecting clinical details over unsecured channels.

Local development

- Open contact.html in a browser to preview.
- To enable a server-based form, replace the form `onsubmit` handler with a POST to your backend and remove the mailto fallback.

Legal reminder

- This site content is written to be supportive and non-prescriptive. It avoids medical claims. Make sure all posted content meets the licensing board rules in {{STATE}} and your professional liability guidelines.

If you need additional pages from this template set (index, about, specialties, approach, fees, faq, book), request the next chunk and specify any brand colors or copy changes you want applied across the site.