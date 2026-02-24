Contact page and tools for the private practice template.

Files in this chunk:
- contact.html — Full contact page with local interactive tools:
  - Session Planner: build a concise session plan and export it as plain text (copy or download). Intended to be used before first appointment to clarify format, frequency, and goals.
  - Intake Wizard: step-through, non-diagnostic intake that produces a short summary and suggested questions to bring to an initial consultation. Includes safety reminder and confidentiality note.
  - Simple contact form (local demo only) and practice information placeholders: {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}.

How to use:
1. Place contact.html alongside the other site pages (index.html, about.html, etc.).
2. Replace placeholder tokens ({{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}) with real values.
3. The interactive tools are fully client-side (no server). For a production site, replace the local contact form behavior with a secure server endpoint or scheduling integration.

Notes and clinician language requirements implemented:
- Includes confidentiality and scope boundaries and an explicit crisis/emergency notice.
- Avoids medical claims and guarantees; language is supportive and practical.
- No external assets, fonts, or CDNs are used. All behavior is local JavaScript.

Developer notes:
- The copy/download actions create blobs and prompt downloads in-browser.
- Copy uses the Clipboard API; fallback alerts appear if blocked.
- The page is intended to be minimal and compatible with static hosts.

If you need additional assets (SVG pattern file or analytics hooks), add them to the assets/ directory and reference from the HTML. This chunk intentionally keeps everything self-contained for ease of integration.