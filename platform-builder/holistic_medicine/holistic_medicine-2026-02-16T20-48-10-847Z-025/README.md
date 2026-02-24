Contact page for the holistic_medicine site (layoutFamily: zen_minimal; voice: warm_storyteller)

Files in this bundle (chunk 4):
- contact.html — A responsive contact/connect page with an inline SVG pattern, membership preview, form, PRACTITIONER info, and clear educational disclaimers.

Purpose & highlights:
- Warm, story-driven tone that invites contact while avoiding medical promises.
- Membership-forward messaging (membership is one of several care options).
- Inline SVG decorative pattern included inside the header for visual richness (no external assets required).
- Contact form uses client-side JS to simulate submission; replace with your back-end or form service endpoint.
- Accessibility notes: inputs have labels; responsive layout stacks on small screens.

Placeholders to replace when deploying:
- {{BUSINESS_NAME}} — clinic or practice name
- {{TAGLINE}} — optional tagline (not used explicitly in this file)
- {{PHONE}} — primary phone number
- {{EMAIL}} — contact email address
- {{PRIMARY_CTA_LABEL}} — main call-to-action button text (e.g., "Book a visit")
- {{PRIMARY_CTA_URL}} — link for the primary call-to-action
- {{CITY}} and {{STATE}} — location context
- {{PRACTITIONER_NAME}} and {{CREDENTIALS}} — provider name and credentials

Integration notes:
- The form currently prevents default submit and shows a friendly confirmation. To hook it up:
  1) Replace the JS section (inside <script>) with code to POST to your server or a service like Netlify Forms, Formspree, or your custom API.
  2) Ensure secure handling of PHI: use HTTPS and a HIPAA-compliant service for clinical data as required.

Design & developer tips:
- The page intentionally avoids external fonts or CDN assets — change styles in the <style> block to match the rest of the site.
- The inline SVG pattern is unique to this page; to reuse it as a separate file, extract the <svg> block into assets/img/pattern.svg and reference it via CSS if desired.
- Update nav links to match any altered filenames for other pages in the site.

Compliance & messaging guidance:
- The content contains educational language and explicit disclaimers; continue to avoid promises of cures and encourage urgent care when appropriate.

If you need the pattern exported as a separate asset or a matching CSS utility file, request an additional bundle with assets/img/pattern.svg and a small CSS include.