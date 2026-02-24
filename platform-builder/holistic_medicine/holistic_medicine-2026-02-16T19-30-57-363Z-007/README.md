# Contact Page — {{BUSINESS_NAME}}

This chunk contains the contact page and a short README for the Holistic / Integrative Medicine site.

Files included in this chunk:
- contact.html — the contact/connect page with all required sections: hero, social_proof, benefits, process, faq, lead_magnet, cta.

Key notes
- Visuals are achieved with CSS (gradients, earthy color vars) and a unique inline SVG pattern. No external images, fonts, or CDNs are used.
- The page includes accessible form controls, aria attributes, and small client-side validation. Forms simulate submission locally — integrate with your backend or email provider as needed.
- Placeholders to replace during build or runtime: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{PRACTITIONER_NAME}}, {{CREDENTIALS}}.

Development / Testing
1. Place this file alongside the other site pages (index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html).
2. Open contact.html in a browser. The page is self-contained; the SVG pattern is inline and the layout adapts for smaller viewports.
3. Hook up form handling by replacing the simulated submit handler in the script with real POST/XHR/fetch logic.

Content Guidance
- The copy avoids promises of cures, focuses on education, whole-person care, and optional lab discussion. It is intentionally minimal and poetic.
- The process section describes intake, plan, optional labs (educational), and follow-ups as required by the project rules.

Accessibility & Performance
- Form fields include labels and the success message uses aria-live for assistive tech.
- The decorative SVG has aria-hidden set and uses low opacity to keep contrast for content.

Styling details
- Color palette leans "earthy_warm" with deep greens, moss, and warm clay accent.
- Rounded cards, soft shadows, and subtle gradients aim for an inviting, calm aesthetic.

If you need a separate assets SVG file, the inline SVG in the page can be extracted into assets/img/pattern.svg and referenced as a background-image data URI or via <img>. However, this build keeps it inline to conform with the constraint of no external assets in this chunk.

Contact
- For further tweaks to voice, layout, or responsive behavior, edit contact.html directly. Replace placeholders during your deployment step.

