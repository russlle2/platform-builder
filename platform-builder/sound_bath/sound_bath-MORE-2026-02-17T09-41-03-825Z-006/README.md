Chunk 4 — contact.html + README for sound_bath site (clinic_modern layout)

What this bundle contains:
- contact.html — full contact / booking page with interactive micro-features and inline SVG pattern.

Placeholders left in the HTML (do not replace here):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Primary features implemented on contact.html:
1) Mood-to-Method selector
   - Four mood chips (Tight / Foggy / Wired / Restless).
   - Selecting a mood morphs the method card (icon, heading, description) and updates the CTA text to include the chosen method.
   - CTA opens the default mail client with a prefilled subject and body including the suggested method. The backend placeholder email remains {{EMAIL}}.

2) Pricing Comparator (monthly vs session pack)
   - Two-option toggle (Monthly / Session Pack).
   - Animated number transition using requestAnimationFrame with easing.
   - Label changes to reflect the selected pricing framing.

3) Contact form + mailto fallback
   - Lightweight client validation (name and email required).
   - Submits via mailto: to maintain zero-backend behavior; email target = {{EMAIL}}.

4) Health & safety note
   - Contraindications are listed as required by rules (pregnancy, seizures, implanted devices, acute psychiatric crisis) with a request to consult providers and to declare concerns when booking.

Design notes and constraints:
- No external assets or fonts are used; the page relies on system fonts.
- Visual texture is created inline with an SVG pattern and subtle gradients.
- Navigation uses a distinct label set: Gather, Events, Private, Rates, Why we practice, Reserve, Reach.
- CTA phrasing is intentionally varied; the mood CTA reads "{{PRIMARY_CTA_LABEL}} — [method]" to keep the placeholder present and add context.
- The page is self-contained: all JS and CSS are inline.

Testing instructions:
- Open contact.html in a browser.
- Click mood chips to observe the method card morph and CTA text change.
- Click the mood CTA or the Send request button to trigger a mail client with prefilled subject/body. (If no mail client is configured, copy the produced mailto URL.)
- Toggle Monthly / Session Pack to watch animated price transitions.

Developer notes:
- The mailto approach preserves privacy and simplicity; replace with a POST endpoint if backend mailing is available.
- The pricing numbers are illustrative; update logic/data to reflect final pricing models.
- For accessibility, simple keyboard interactions are wired for the pricing toggle and regular form semantics are preserved.

Files generated in this chunk:
- contact.html
- README.md

Next chunk expectations (not included here):
- The events page must include a next-event module + calendar list.
- Unique SVG asset at assets/img/pattern.svg will be provided in a future chunk if required; this page includes an inline pattern to keep visuals consistent without external files.