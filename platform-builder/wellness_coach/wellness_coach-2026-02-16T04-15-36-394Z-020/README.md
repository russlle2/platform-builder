# Contact Page & Notes for {{BUSINESS_NAME}}

This bundle contains the contact page (contact.html) for the earthy_warm template family and a short README to help you customize it.

Files provided:
- contact.html — full contact page with hero, social proof, benefits, process, FAQ, lead magnet, and call-to-action elements.

Design intent:
- Layout: warm, organic cards and rounded shapes to create approachable, premium presence.
- Voice: gentle_therapist — calm, supportive, outcome-focused copy.
- Program emphasis: VIP Day + habit-forward followup (programModel: vip_day).

Customizable placeholders (replace these across the file):
- {{BUSINESS_NAME}} — your business or practice name
- {{TAGLINE}} — a short descriptive tagline
- {{PHONE}} — contact phone number
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — primary button label (e.g., "Book a VIP Day")
- {{PRIMARY_CTA_URL}} — primary CTA link (booking or lead magnet endpoint)
- {{COACH_NAME}} — coach name
- {{CREDENTIALS}} — credentials line (e.g., "MSc, Wellness Coach")
- {{CITY}} — city
- {{STATE}} — state

Editing guidance:
- To change colors, update :root variables near the top of the page.
- Forms are intentionally minimal and post to placeholders; wire them to your form handler or backend.
- The lead magnet form submits to {{PRIMARY_CTA_URL}} — replace with your email service endpoint.
- The contact form currently posts to /thank-you — change to your preferred handler or add server-side processing.

Accessibility & performance:
- Uses semantic sections, headings, and details for FAQ to improve keyboard navigation.
- No external assets or fonts: keeps load fast and private by design.

Notes on ecosystem:
- This page assumes other templates exist (index.html, about.html, programs.html, pricing.html, testimonials.html, book.html). Update nav labels if your site uses different slugs.
- Keep consistent brand tone across pages: this design favors small wins, practical habits, and gentle accountability.

If you need alternate layouts (mobile-first, image-heavy, or more clinical), request a revision and specify the layoutFamily and voiceFamily to tailor the page further.