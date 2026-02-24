# Contact Page — aromatherapy-MORE-2026-02-17T17-32-35-433Z-049

This bundle contains the contact page and a short README for the aromatic practice site built with layoutFamily=zen_minimal and voiceFamily=executive_sharp.

Files included in this chunk:
- contact.html — Full contact page with an interactive "Session Planner" and scroll-triggered reveal effects.
- README.md — This document.

Placeholders to replace in contact.html:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented locally (no external libraries or CDNs):
- Scroll-triggered section reveal using IntersectionObserver, with support for "prefers-reduced-motion: reduce". If a visitor prefers reduced motion, the page shows content immediately and skips animations.
- Session Planner widget:
  - Lets users pick focus, duration, intensity, and scent families.
  - Builds a safety-forward session summary (includes suggested carrier, dilution heuristic, and a sample aromatic composition).
  - Exports a plaintext summary visible on the page.
  - Copy-to-clipboard button (uses navigator.clipboard with a fallback).
  - Email link pre-populates an email to {{EMAIL}} with the plan in the body.
- Accessible, lightweight form elements and clear safety language: all guidance uses "may" or advisory wording—no medical claims.

Safety & content notes:
- The FAQ in the contact page includes dilution, patch test, pets, and pregnancy notes as required.
- The planner outputs dilution heuristics and encourages patch testing and disclosure of pregnancy/medication.

Usage:
1. Replace placeholders in contact.html with your business data.
2. Serve the HTML file using any static server or open it in a browser for testing.
3. The copy and email functions work locally; the contact form currently simulates submission with an alert (adapt to your preferred backend as needed).

Design & UX decisions:
- Navigation labels intentionally differ from other site templates: "Offerings", "Formulas", "Botanica", "Plans", "Who We Are", "Reserve", "Connect".
- The Session Planner is embedded on the contact page so visitors can craft a short, shareable summary before booking.
- Visuals are created with inline SVG and gradients—no external images or fonts.

Developer notes:
- To integrate with back-end booking, wire the contact form to your endpoint in handleContact(e).
- The planner offers a simple heuristic for dilution; replace with your clinical guidelines if desired.

License: deliverable for client use. Replace placeholder values before publishing.