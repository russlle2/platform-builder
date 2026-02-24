Contact page — holistic_medicine

This contact.html is part of the earthy_warm / mystic_modern template set. It is intentionally self-contained (no external assets or CDNs) and uses only local HTML/CSS/JS.

Placeholders to replace in your deployment:
- {{BUSINESS_NAME}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features
- Accessible, responsive layout with an earthy warm palette and soft SVG pattern embedded inline (no external images required).
- Navigation uses custom labels that map to the local pages: index.html, services.html, conditions.html, approach.html, pricing.html, about.html, book.html, contact.html.
- Contact form with local draft save (localStorage) and simulated send behavior. No real network requests by default.
- Guided pause modal (Try a guided pause) implemented entirely in vanilla JS. Modes:
  - Breathing: simple inhale / hold / exhale cycle with visual pulse and countdown.
  - Journaling: prompt, textarea, and saved entries (persisted in localStorage under hm_journal_v1).
  - Intention: set a short one-line intention that appears pinned in the contact sidebar (persisted under hm_intention_v1).
- Keyboard shortcut: press "G" to open the guided pause modal.
- Scroll-triggered reveal for sections implemented with IntersectionObserver; honors prefers-reduced-motion and will disable transitions if the user prefers reduced motion.
- UI copy and CTAs are intentionally distinct from other templates; pricing and program naming are referenced generically ("intensives", "short check-ins") to leave room for customization.

Accessibility & privacy notes
- The page is not a replacement for urgent care. It includes a brief disclaimer about crisis support.
- Modal has aria-hidden toggling and role=dialog; clicking outside or the Close button dismisses it.
- Saved data (drafts, journal entries, intentions) are stored locally on the device (localStorage). No server-side storage occurs in this static template.

Developer notes
- To customize: replace placeholders, adjust the CSS variables in the <style> block for color theming, and connect the contact form to a server endpoint if needed.
- The embedded SVG pattern is intentionally minimal and unique to this build; it is inline to avoid external asset dependencies.
- If you need to disable the guided exercise features, remove or comment the script block and the #tryNowBtn button.

Files in this bundle:
- contact.html — this page
- README.md — this file

License & tone
- Copy is educational and supportive; no medical claims are made. Keep disclaimers when adapting content for clinical contexts.