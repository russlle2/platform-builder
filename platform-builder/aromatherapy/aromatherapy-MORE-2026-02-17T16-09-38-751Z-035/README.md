Contact page and developer notes for the aromatherapy site (chunk 4).

Files included in this bundle:
- contact.html  — Contact page with session-planner widget and scroll-reveal behavior.

Purpose:
- This contact.html implements the session planner interactive widget (builds a plaintext session summary and permits copying or downloading the .txt file).
- Implements scroll-triggered reveal animations while honoring prefers-reduced-motion.
- Uses only local JS/CSS, no external libraries or CDNs.

Key features and implementation notes:
- Scroll reveal: Elements with the attribute data-reveal animate into view via an IntersectionObserver. If the user has prefers-reduced-motion: reduce, the elements are revealed immediately with no transitions.
- Session Planner: A small form builds a suggested plan in plaintext. The build button composes the output, which appears in a monospace-styled result block. Users can copy the text to clipboard or download it as session-plan.txt.
- Safety language: The planner output includes patch-test instructions, dilution guidance, and environment/pregnancy/pet notes. All language avoids medical claims and uses "may support" phrasing.
- Accessibility: live region (aria-live) on the result area is set to polite so screen readers announce changes. Controls are standard form elements.

Placeholders to replace in your environment:
- {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}

Styling notes:
- Design uses an earthy/warm palette with CSS variables. Background references assets/img/pattern.svg for the repeating page pattern — make sure that asset exists (unique SVG expected elsewhere in the project).
- No external fonts or images are required.

How to test locally:
1. Place this file alongside the other site files in the project directory.
2. Open contact.html in a modern browser (Chrome, Firefox, Safari).
3. Test the session planner: enter values, click "Generate plan", then try "Copy summary" and "Download .txt".
4. Toggle your OS preference for reduced motion and refresh to verify the reveal behavior.

Notes for production:
- The contact form currently provides local feedback only; integrate with your backend or form service to accept messages.
- The planner is intentionally simple: if you add server-side features, ensure privacy for submitted notes and secure storage for any health-related disclosures.

Design and voice:
- Voice aims for executive/concise clarity: safety-forward, practical, and professional.
- The page avoids repeating headline tokens flagged as recently used in other templates.

Developer reminders:
- Ensure the unique SVG at assets/img/pattern.svg is present and not reused across other templates to preserve uniqueness constraints.
- If you extend the planner (analytics, persistence), respect user privacy and avoid storing sensitive personal health information unencrypted.

End of notes.