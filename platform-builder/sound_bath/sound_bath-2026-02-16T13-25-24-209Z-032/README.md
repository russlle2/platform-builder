Project: Sound Bath Site — chunk 4

Files included in this bundle:
- contact.html  -> Contact and information page for {{BUSINESS_NAME}}
- README.md     -> This file

Purpose
This chunk provides the contact page for the sound bath site. The page follows the "glass_morphism" layout family and uses a "clinical_calm" voice — concise, clear, and reassuring. The offer model is "hybrid" (community drop-ins + private/hybrid packages).

Structure of contact.html
- Header with nav. Labels vary (e.g., "Upcoming" not "Events") to maintain unique nav voice across the project.
- Hero: CTA with placeholders ({{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}), facilitator and venue quick facts.
- Story: premium sensory description.
- Framework: explicit session flow (arrival, breath, sound immersion, integration).
- Offers: brief overview of community and private offerings.
- Pricing: quick pricing guide for transparency.
- Testimonials: two short quotes.
- CTA/Contact form: name, email, type, message; posts to {{PRIMARY_CTA_URL}}.
- Practical essentials: "what to bring", contraindications disclaimer, accessibility and arrival notes.

Placeholders to replace
- {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{NEXT_EVENT_DATE}}

Design notes
- Visual richness is achieved with CSS gradients, glass morphism, and an external SVG tiled pattern at assets/img/pattern.svg (referenced by the page). Create a unique assets/img/pattern.svg and place it in the project root assets folder.
- No external fonts, images, or CDNs are referenced.
- Keep the voice clinical and calm: short paragraphs, clear safety notes, and precise session flow.

Accessibility
- Form elements are labeled. Links use semantic anchors. Use ARIA labels if you add complex interactive widgets.

Customization
- Replace placeholders across the file.
- Adjust pricing and offerings as needed.
- To change the primary CTA destination, update {{PRIMARY_CTA_URL}}.

Developer reminders
- The page references assets/img/pattern.svg; ensure you add a bespoke SVG pattern there to maintain the intended layered background look.
- If you split CSS into a separate file, preserve the glass and gradient variables and the body::before background layering.

Revision details
- Layout family: glass_morphism
- Voice family: clinical_calm
- Offer model: hybrid

End of README