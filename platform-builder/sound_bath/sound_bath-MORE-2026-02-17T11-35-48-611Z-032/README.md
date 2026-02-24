Contact page and usage

Files in this chunk:
- contact.html — The Connect page with an interactive "Session Planner" and a contact form. Replace placeholders in the file with your business details.

Placeholders to replace (case-sensitive):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Primary features implemented
- Local Session Planner widget (pure JS): choose length, focus, instruments, participants, intensity and custom notes. "Compose plan" builds a clear plaintext summary.
- Copy & Download: A Copy button writes the plaintext summary to the clipboard. A Download button saves the summary as a .txt file.
- Scroll-triggered reveal for sections: uses IntersectionObserver; disabled when the user prefers reduced motion (prefers-reduced-motion: reduce) so the content appears without animation.
- Contact form: local-only demonstration. When submitted, it appends the planner summary to the message field and resets. Replace with server logic to enable sending.
- Accessibility considerations: aria-live for dynamic summary, prefers-reduced-motion respected, clear focusable controls and sensible labels.
- Safety notes: A contraindications section and a clear note for trauma-informed requests are included.

Design notes
- Layout: split diagonal hero with an SVG pattern reference at assets/img/pattern.svg (unique pattern must be added to that path elsewhere in the project).
- Navigation labels differ from the common templates: Home, Gatherings, Bespoke, Invest, Story, Learn, Book, Connect.
- CTA phrasing uses placeholders so you can set a localized action label and URL.

Integration
- Add your pattern SVG at assets/img/pattern.svg used by the hero background for visual texture.
- Wire the contact form to your backend or a mail service; currently it demonstrates local behavior only and shows a browser alert on submit.

Notes for developers
- The planner summary generator is intentionally minimal and plaintext-focused to be easy to copy/paste into emails or booking systems.
- The code avoids external libraries and CDNs. All JS, HTML and CSS are local and embedded.
- Replace placeholder text before publishing; keep the contraindications language intact to remain responsible about safety.

If you need a variant of the planner (e.g., include pricing estimates, timezone-aware scheduling, or iCal export), request a follow-up and specify desired behaviors.