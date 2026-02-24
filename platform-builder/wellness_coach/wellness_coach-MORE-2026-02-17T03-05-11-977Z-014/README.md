# Contact page — wellness_coach (chunk 4)

Files in this chunk:
- contact.html
- README.md

Purpose
- contact.html is the site contact + interactive mini-planning tool for the wellness coaching site. It provides a 30-day path visualizer, a rotating proof/testimonial gallery with credibility badges and tooltips, and a contact form that opens the visitor's mail client with a prefilled message.

Key interactive features

1) Progress meter / 30-day path map
- Visitors choose one or more outcome goals (energy, sleep, stress, move, nutrition, focus).
- The page draws a 30-day SVG path of nodes where node size/color is driven by selected goals.
- Hovering a day updates a concise suggestion in the summary line.
- Users can copy the entire 30-day plan text to clipboard via "Copy plan".
- The plan generation is local JS only and does not store or transmit data.

2) Proof Gallery (rotating testimonials + badges)
- A small testimonial rotator automatically cycles, with manual prev/next controls.
- Credibility badges show contextual tooltips on hover.
- The rotator pauses when the user hovers the proof area.

3) Contact form (local flow)
- Form fields: name, email, phone, primary goal, notes.
- On submit the form builds a mailto: link populated with the form content and the generated 30-day plan text, then navigates to that link to open the user's mail client. This keeps implementation serverless and local.
- A direct button to the booking URL ({{PRIMARY_CTA_URL}}) is also provided.

Design & accessibility notes
- Clean, high-contrast dark UI using only local CSS and SVG.
- Simple keyboard-accessible controls and basic aria labels on SVG and nav.
- No external fonts, assets, images or CDNs are used in this chunk. The template references a site-local assets/img/pattern.svg for broader site styling in other chunks.

Placeholders
- The contact page contains the following placeholders that must be replaced in the site build or templating step: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.

Integration notes
- Nav links point to other expected pages: index.html, about.html, services.html, programs.html, pricing.html, testimonials.html, book.html, contact.html.
- The primary CTA uses {{PRIMARY_CTA_URL}}; ensure that route exists (likely book.html or an external booking link).

Customization
- Goal micro-habits and the behavior of the 30-day ramp are controlled in the goalConfig object in the inline script. Adjust base influence and micro-habit text there.
- Testimonials are embedded in the testimonials array.

Security & privacy
- No analytics, remote APIs or external resources are used in this chunk.
- The contact flow uses the visitor's mail client via mailto: to avoid server-side handling in this example.

If you need additional pages or the assets/img/pattern.svg file produced in this bundle, request the next chunk which contains the remaining pages and site assets.