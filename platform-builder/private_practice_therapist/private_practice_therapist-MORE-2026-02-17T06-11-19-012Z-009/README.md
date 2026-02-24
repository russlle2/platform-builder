Contact page and notes for private_practice_therapist-MORE-2026-02-17T06-11-19-012Z-009

Files in this chunk:
- contact.html — the contact & intake touchpoint with a Mood-to-Method selector, policy accordion, and crisis footer.

Purpose & features:
- Mood-to-Method selector: users pick how they feel; the recommended approach card updates title, description, and the primary CTA label + link. This is local JS only and intended to help visitors translate emotion into a proposed next step.
- Session boundaries / Confidentiality accordion: accessible accordion items that explain session length, confidentiality limits, scope, payments, and telehealth options. Includes a respectful crisis footer (emergency instructions) as required.
- Lightweight contact form: collects name, email, phone (optional), short message; mimics a send action locally and resets form with a simulated acknowledgement.
- Styling: single-file CSS with an unobtrusive SVG pattern referenced at assets/img/pattern.svg. (Ensure assets/img/pattern.svg is present in the project with a unique pattern.)
- Navigation labels intentionally different: Home, Meet, Areas, Method, Investment, Questions, Schedule, Reach (correct links to the other pages expected in the site bundle).

Placeholders to replace when integrating:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not shown directly on this page but available in templates)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Mood mapping (local JS):
- overwhelmed -> Stabilizing short-focus (cta: "Book a short-focus consult", url: "book.html#short-focus")
- stuck -> Exploratory work (cta: "Start an exploratory session", url: "book.html#exploratory")
- curious -> Growth & skill work (cta: "Explore growth options", url: "book.html#growth")
- exhausted -> Careful pacing plan (cta: "Request pacing consultation", url: "book.html#pacing")
- grieving -> Supportive processing (cta: "Arrange a supportive session", url: "book.html#supportive")

Notes on therapist-appropriate content:
- Language intentionally supportive and non-guaranteeing; no medical claims are made.
- Confidentiality, scope limits, and an explicit crisis instruction are included to meet ethical guidance.
- No manipulative scarcity or pressure-driven CTAs are present.

Accessibility & behavior:
- Accordion uses buttons, visible text changes, and simple show/hide for panels.
- Mood selector behaves like a selectable button group with keyboard support for Enter/Space.

Integration tips:
- Provide a unique SVG at assets/img/pattern.svg for the background pattern.
- Wire the primary CTA placeholders to real scheduling endpoints when ready.
- Replace placeholders with real clinic data and review legal/ethical wording per local regulations and licensing board guidance.

If you want, I can also:
- Produce the assets/img/pattern.svg file with a custom pattern.
- Add analytics hooks or server-side handlers for the contact form.
- Tune the copy to match your clinician voice or local practice policies.
