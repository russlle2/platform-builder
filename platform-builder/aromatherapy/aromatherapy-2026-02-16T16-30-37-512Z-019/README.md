# Contact Page & How to Use — {{BUSINESS_NAME}}

This chunk contains the contact page (contact.html) built for an earthy_warm visual family and a warm_storyteller voice. It is designed for an aromatherapy practitioner membership model.

Files provided in this bundle:
- contact.html — ready-to-use static contact page with hero, story, framework, offers, pricing teaser, testimonials, safety FAQ, and CTA.

Quick customization checklist:
- Replace placeholders: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{FAVORITE_BLEND}}.
- Hook the form: the form currently uses a client-side simulation. Change the <form action="#" method="post"> to your backend endpoint, or wire to a serverless function or email service.
- Pricing & membership links: links point to pricing.html, book.html, shop.html, etc. Ensure those pages exist in the same site root.

Accessibility & safety notes:
- The content is intentionally safety-forward: no medical claims are made. The page includes reminders about dilution, patch testing, pets, and pregnancy considerations.
- Keep language consistent with non-medical guidance. Any future copy should follow these constraints.

Styling & assets:
- Visual richness comes from CSS variables, gradients, and an inline SVG pattern. No external fonts or images are required.
- Colors are controlled in :root for easy brand tweaks.

Integration tips:
- For membership signups, route the form to your membership system or collect basic leads and redirect users to {{PRIMARY_CTA_URL}}.
- To add analytics or notifications, place scripts before the closing </body> tag and ensure privacy considerations for contact data.

Deployment:
- Drop contact.html into your static site root or template engine. Replace placeholders server-side or during a build step.

If you need a matching assets/img/pattern.svg or additional pages (index, services, blends, shop, pricing, about, book), request the next chunk and include desired variations for headings and section order — this keeps each page unique and cohesive.

Thank you for designing a thoughtful, safety-first aromatherapy experience.
