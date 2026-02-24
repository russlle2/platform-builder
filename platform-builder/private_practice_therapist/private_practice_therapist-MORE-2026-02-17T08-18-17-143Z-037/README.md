Contact page and usage notes for the private practice therapist template.

Files included in this chunk:
- contact.html — Contact page with an interactive Session Planner and a scroll-triggered reveal system.

Key features
- Session Planner widget: build a personalized plan, view a plaintext summary, copy to clipboard, or download as a .txt file. The planner is intended as a planning tool and not a substitute for clinical assessment.
- Scroll-triggered section reveal: uses IntersectionObserver and respects prefers-reduced-motion. If a visitor prefers reduced motion the page will show sections immediately without animation.
- Accessible, local-only implementation: no external libraries or CDNs required. All interactive logic is inlined JavaScript inside contact.html.

Placeholders to replace
- {{BUSINESS_NAME}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Behavior notes
- The contact form is a simple mailto fallback to allow quick messaging; in production replace with a secure form handler if you need server-side processing or storage.
- The Session Planner generates a plaintext plan that includes a short clinician-style framing, practical items, confidentiality reminders, and a crisis note. The text should be reviewed and adjusted to match your practice policies before distribution.

Clinical and legal reminders
- The content intentionally avoids medical claims and guarantees. It includes a confidentiality statement and an explicit crisis notice directing people to emergency services when needed.
- Make sure your privacy policies, fees, and cancellation terms are provided elsewhere on the site or during intake.

Testing
1. Open contact.html in a browser (file:// or via local server).
2. Scroll the page to observe reveal animations; enable "Reduce motion" in your OS to confirm prefers-reduced-motion behavior.
3. Use the Session Planner to build a plan, then click Copy plan and Download .txt to confirm export functionality.

Customization
- Update placeholders with your practice information.
- Adjust the Session Planner options and copy to reflect your therapeutic approach and administrative details.

Notes for developers
- The decorative SVG pattern is embedded as a data URI in the page styles so no external assets are required for this chunk.
- All scripts are written to be small and dependency-free. If integrating into a larger site, consider moving scripts into separate files and bundling as desired.
