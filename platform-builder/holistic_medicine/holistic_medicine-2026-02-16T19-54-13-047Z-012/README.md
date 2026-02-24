This chunk contains the contact page template and a short README for the holistic / integrative medicine site.

Files included:
- contact.html — a responsive, accessible contact page designed for a warm storyteller voice and a membership-based offering model. It includes:
  - Decorative SVG background (inline) with a unique pattern and soft gradients.
  - Navigation with varied link labels to avoid repetition across templates.
  - Contact card with phone and email placeholders: {{PHONE}} and {{EMAIL}}.
  - A simple contact form (client-side no-op) that uses {{PRIMARY_CTA_LABEL}} for the submit label.
  - Practitioner and privacy notes using placeholders: {{PRACTITIONER_NAME}}, {{CREDENTIALS}}.
  - Location and membership nudge with links to pricing and booking.

Placeholders (do not replace in this chunk):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{CREDENTIALS}}

Developer notes:
- Visual richness is created using inline SVG + CSS gradients; there are no external assets or CDNs required.
- The page intentionally avoids medical promises. It reminds visitors that messages are not a substitute for emergency care and references practitioner review.
- Nav labels differ from other templates ("Offerings", "Concerns", "Our Way", "Memberships", "Meet", "Reserve") to satisfy uniqueness requirements.
- If you want a separate assets SVG file (assets/img/pattern.svg), you can extract the <svg> from contact.html and save it. For this chunk the SVG is intentionally embedded to keep the deliverable self-contained.

Integration tips:
- Wire the form to your backend or a contact service; currently the form prevents default submission and shows a placeholder alert.
- Use {{PRIMARY_CTA_URL}} where you want the primary CTA to lead (e.g., scheduled booking or member sign-up).
- Review accessibility and localization for your audience; adjust font sizes and contrast if needed.

Pages present in the full site (other chunks will include these): index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html.

License: this template is provided as-is for use in building the integrative medicine membership site. Be sure to review content for compliance and regional medical regulations.