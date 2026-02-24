This chunk includes two files for the holistic / integrative medicine website (layoutFamily=clinic_modern, voice=clinical_calm).

Files included:
- contact.html — Contact page you can drop into the site. Uses placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{CREDENTIALS}}.

Notes & integration:
- The contact form posts to /api/contact by default. Replace this path or provide a server endpoint that accepts JSON POSTs. The client expects a JSON response with an optional 'message' field.
- For production, secure and validate submissions server-side, integrate with your scheduling system, and comply with privacy regulations (HIPAA where relevant).
- No external fonts or images are used. Visual interest is created via CSS gradients and an inline, unique SVG pattern placed in contact.html.

Accessibility & content guidance:
- The page includes an emergency disclaimer. Maintain clear non-promissory language — do not imply guaranteed cures.
- Use placeholders to localize practitioner and clinic details. Keep the practitioner credentials concise.

Suggested backend behavior for /api/contact:
- Validate required fields (name, email, consent). Rate-limit submissions.
- Store messages securely and send a confirmation email to the site owner and optional auto-reply to the sender.
- Return JSON: {"message":"Your request has been received."}

Optional asset (pattern svg file):
If you prefer a separate SVG asset rather than the inline pattern, create assets/img/pattern.svg using the following suggested SVG (unique pattern):

<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0" stop-color="#e6fffb" />
      <stop offset="1" stop-color="#eef9ff" />
    </linearGradient>
    <pattern id="p" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
      <rect width="80" height="80" fill="url(#g)" />
      <circle cx="10" cy="10" r="2.6" fill="#c7f3f0" />
      <circle cx="40" cy="40" r="1.7" fill="#dff9f8" />
      <circle cx="60" cy="20" r="2.2" fill="#bff0ee" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p)" />
</svg>

Developer tips:
- Keep nav labels slightly varied across pages for uniqueness (this contact page uses "Home, Services, Concerns, Our Process, Plans").
- Maintain clinical tone and educational emphasis across site pages.
- Ensure the contact endpoint is not used for emergency triage.

End of chunk 4 README.