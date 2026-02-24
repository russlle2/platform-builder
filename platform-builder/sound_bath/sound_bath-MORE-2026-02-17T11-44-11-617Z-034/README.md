Chunk 4 — contact.html

Included files:
- contact.html: The contact page and local guided exercise modal.

Features implemented in this chunk:
- Contact page with hero, contact form, quick info card, health & safety / contraindications notice, and concise workflow explanation.
- Local "3-minute reset" guided exercise modal with three modes: Breathing, Journal prompt, and Intention setting. Runs fully in-browser (no network calls). Includes a visual pulse and a simple timer.
- Scroll-triggered reveal for elements with class "reveal" implemented with IntersectionObserver, with automatic respect for prefers-reduced-motion (elements appear instantly when reduced-motion is requested).
- Accessible details: keyboard close (Esc) for the modal, basic focus-trap while modal is open, ARIA attributes for dialog and navigation.
- No external assets, fonts, or CDNs used. The layout references an SVG pattern at assets/img/pattern.svg but no external loading is performed; add the file in assets if desired.

Placeholders kept for later templating:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

How to test locally:
1. Open contact.html in a modern browser.
2. Scroll down the page to see sections reveal. Toggle "Reduce motion" in your OS to confirm reduced-motion behavior.
3. Click "Try a 3-minute reset" to open the modal. Select a mode, Start, Pause, and Close. The exercise runs locally and displays a timer; no audio files are used.
4. Submit the contact form — the demo alert indicates the form flow; wire up server handling as needed.

Notes:
- This chunk is self-contained and intended to be combined with the rest of the site skeleton (index.html, events.html, etc.).
- Ensure to include an SVG pattern at assets/img/pattern.svg for background decoration if required by broader site visuals.

Design choices summary:
- Earthy, warm palette and compact, executive copy to reflect the niche; navigation labels emphasize gatherings, private offerings, and clear pathways to book or connect.
- Modal exercise prioritizes short, actionable practice with simple visual guidance to be usable in quiet or low-bandwidth contexts.

End of chunk 4.