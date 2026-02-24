Chunk 4 — contact page and notes

This bundle contains two files for the sound bath site (slug: sound_bath-2026-02-16T13-42-22-137Z-036, seed: 3521896859).

Files included:
- contact.html — A sensory, premium contact page designed for the "split_diagonal" layoutFamily and a playful, premium voice. It includes:
  - Header with subtle nav labels (varied from other pages)
  - Left column: brand, quick contact, what to bring, session flow, contraindications and safety notes
  - Right column: contact form (session type selector includes group, 1:1, couples, corporate), quick next-event display, CTA and phone link
  - Visuals strictly via CSS + background SVG reference (assets/img/pattern.svg) and gradients — no external fonts or CDNs.
  - Inline script: lightweight form validation to ensure name, email, and contraindication acknowledgement.
  - Placeholders used (do not replace here): {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}, {{FACILITATOR_NAME}}, {{VENUE_NAME}}, {{NEXT_EVENT_DATE}}.

- README.md — this file (you are reading it).

Developer notes:
- The contact form posts to {{PRIMARY_CTA_URL}} by default. Replace that placeholder with your chosen endpoint or use a form handling service. For immediate email fallback, you may convert the form to a mailto: action, but server handling is recommended for reliability.
- Accessibility: labels are present for form fields; the script provides a basic guard for required inputs. Consider server-side validation and reCAPTCHA if spam becomes an issue.
- Visual assets: the page references assets/img/pattern.svg for the decorative background. Ensure an appropriately themed SVG exists at that path (unique pattern per site). The SVG should be self-contained (no external font references).
- Instruments & text: The contact page intentionally lists a varied instrument set (gongs, tuning forks, chimes, monochord) to differentiate content across site pages. Keep variation across the site to satisfy uniqueness requirements.

Integration checklist:
1. Copy contact.html into the site root alongside other pages (index.html, events.html, etc.).
2. Make sure assets/img/pattern.svg exists and is stylistically consistent.
3. Replace placeholder tokens with real data.
4. Wire form action to your booking endpoint and test submissions.

Design notes (mapping):
- layoutFamily: split_diagonal — use a two-column split with a decorative diagonal/gradient feel.
- voiceFamily: playful_premium — maintain warm, slightly playful language while signaling premium service.
- offerModel: intensive — emphasize focused, intentional sessions and safety.

If you need alternate sizes, microcopy edits, or a plain-text email template for form submissions, ask and I’ll provide them.