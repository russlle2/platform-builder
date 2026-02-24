Chunk 4 — contact page and notes for private_practice_therapist-MORE-2026-02-17T08-30-17-332Z-040

Files included:
- contact.html — Full contact/connect page with two interactive, local JS tools:
  - Session Planner: build a short plan (concern, outcome, service shape, cadence, notes). Produces a plaintext summary that can be copied or downloaded as .txt.
  - Self-screening intake wizard: a brief 3-step guided intake (non-diagnostic). Produces a short list of notes and suggested questions to bring to a consultation; copyable.
  - A small "snapshot" utility to prepare a one-line note for outreach.
  - Footer includes confidentiality, scope boundaries, and crisis guidance.

Notes & placeholders:
- The HTML uses placeholders that must be replaced by the templating system or build process:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}} (unused on this page but available elsewhere)
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}

Design & constraints:
- Layout uses an "earthy_warm" palette and a calm, modern voice; no external assets or CDNs are referenced.
- The page references assets/img/pattern.svg for a background motif; include a unique SVG there in the asset bundle (not provided in this chunk).
- All interactive behavior is local JavaScript — no external services.

Accessibility & clinical notes:
- Language is intentionally supportive and non-diagnostic. No medical claims or guarantees are made.
- Confidentiality, scope limits, and crisis instructions are included in the footer.
- Avoids manipulative scarcity; scheduling buttons link to placeholders and local book.html.

Developer hints:
- If you create assets/img/pattern.svg, ensure the pattern complements the earthy palette.
- The planner and wizard output plain text; easy to store or attach to a contact form.
- To integrate with a booking flow, wire {{PRIMARY_CTA_URL}} to the booking endpoint (book.html or external scheduling tool).

End of chunk 4.