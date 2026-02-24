Contact page and local notes for the private_practice_therapist site (chunk 4)

Files included in this chunk:
- contact.html  : Contact / connect page with proof gallery and pricing comparator micro-interactions.

Placeholders used (do not remove; replace at deploy time):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Features implemented on contact.html:
- Navigation matching site pages (Home, Story, Specialties, Method, Invest, Help, Begin, Connect).
- Hero with contact intent and a CTA button that uses PRIMARY_CTA_URL and PRIMARY_CTA_LABEL.
- A rotating "Proof Gallery" (testimonials) that cycles text and author every 5s and displays credibility badges with tooltips.
- A micro "Pricing Comparator" toggle between Per Session and 3-Session Series with animated number transitions.
- Contact form (client-side only) with a simulated send interaction (no backend). 
- Confidentiality, scope boundaries, and crisis guidance language included.

Accessibility & safety notes:
- Tooltips are exposed on hover and focus; aria roles added to basic elements.
- Crisis instructions explicitly advise emergency services and 988 for U.S. users.
- No medical claims or guarantees are made; language is clinical and supportive.

Local testing:
1) Serve the project folder with a static server (e.g., `npx serve` or `python -m http.server`).
2) Open http://localhost:5000/contact.html (or the port your server uses).
3) Replace placeholders when integrating into the full site.

Design notes:
- Visual identity leans toward a calm, modern palette and a compact, playful UI (rounded cards, warm accent).
- The contact page intentionally balances clear action (CTA / phone / email) with clinical boundaries.

Developer notes:
- This chunk does not include assets/img/pattern.svg — that asset is created in a different chunk.
- Pricing values in the comparator are example figures inlined in JS (prices.one, prices.series) and can be adjusted from the script.
- The form is intentionally client-side only. Integrate with your preferred backend or form endpoint as needed.

If you need a variation of the contact copy or different interactive behavior (e.g., longer testimonial list, remote badge set, or currency localization), tell me which pieces to change and I will update the HTML/JS accordingly.