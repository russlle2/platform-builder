Contact page for aromatherapy VIP-day site (slug: aromatherapy-MORE-2026-02-17T15-56-59-831Z-033).

Files in this chunk:
- contact.html — full contact page with local JS and CSS. Includes:
  - Contact form that opens a mailto: with prefilled fields (no backend).
  - A "Try a short guided exercise" modal: 3-minute guided breathing + journaling flow implemented in plain JS.
  - Scroll-triggered reveal for sections using IntersectionObserver with respects to prefers-reduced-motion.
  - Accessibility: basic focus trap for the modal and keyboard close handling.
  - Placeholder tokens retained: {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
  - Safety-forward FAQ content (dilution, patch test, pets, pregnancy) with "may support" style language.

Notes for local development:
- This is a static HTML page. Place it alongside other site pages (index.html, services.html, etc.) and ensure assets/img/pattern.svg exists for the page background pattern.
- No external fonts or CDNs are used.
- Form submission uses a mailto: flow to open the default mail client.

Design & behavior details:
- Layout uses an earthy warm palette and a lightweight card system.
- The modal uses window.setInterval for the guided timing and is mindful of reduced-motion preferences (the CSS disables transitions when reduced-motion is set).
- The scroll reveal defaults to immediate visibility when prefers-reduced-motion is active.

Replace placeholders with real business values when deploying. Ensure an assets/img/pattern.svg is provided to match the site aesthetic.