Contact page and developer notes for the cohort-style holistic medicine template (chunk 4).

Files included in this bundle:
- contact.html — complete contact + timeline planner + proof gallery (rotating testimonials and badges with tooltips).

Placeholders to replace before publishing:
- {{BUSINESS_NAME}} — business display name
- {{TAGLINE}} — (not used on this page but present across project)
- {{PHONE}} — phone number for links and text
- {{EMAIL}} — contact email
- {{PRIMARY_CTA_LABEL}} — main CTA button text (e.g., "Join cohort")
- {{PRIMARY_CTA_URL}} — target URL for primary CTA
- {{CITY}}, {{STATE}} — location labels

Features implemented in contact.html:
- Timeline planner: three adjustable phases (sliders). "Preview Roadmap" computes a suggested calendar timeline and shows a clear disclaimer that this is educational and not medical advice.
- Proof Gallery: rotates testimonials automatically; previous/next controls; autoplay toggle. Credibility badges include short tooltips, accessible via hover and keyboard (Enter/Space toggles tooltip briefly).
- Contact form: local validation and simulated submit (no server calls). Shows a friendly success note after submission.
- Nav uses a distinct label set: Discover, Sessions, Conditions, Method, Investment, Team, Schedule, Connect.

Design notes and constraints:
- No external assets, fonts, or CDN usage. The hero uses a local SVG pattern referenced at assets/img/pattern.svg. Provide that SVG in another chunk of the project.
- Tone: playful-premium, cohort offer model, educational and non-prescriptive. No language implying cures or guarantees.
- Ensure Conditions page includes clinical disclaimers; this contact page reiterates an educational-only stance for planning tools.

Integration tips:
- Replace placeholder tokens with real values during build/deploy or with a templating engine.
- If you add assets/img/pattern.svg, keep file local and unique to this project (not reused from other templates).
- The contact form is intentionally local-only. Wire it to your backend or a form handler by changing the form action and removing the onsubmit="return false" attribute.

Accessibility & performance:
- Tooltips are keyboard-focusable and dismiss automatically. Testimonials rotate on a timer; autoplay can be toggled off.
- Minimal client JS, no frameworks — easy to adapt or extract components.

If you need a companion SVG pattern file or the remaining pages (index.html, services.html, etc.), request the next chunk and specify which assets to include.