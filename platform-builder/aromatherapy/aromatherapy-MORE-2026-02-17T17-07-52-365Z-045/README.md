Contact page (chunk 4) — aromatherapy-MORE-2026-02-17T17-07-52-365Z-045

Files included in this chunk:
- contact.html — the contact page with an on-page Session Planner widget and scroll-triggered reveal behavior.

Key features and notes:
- Session Planner: interactive form builds a plaintext plan you can copy or download. The "Compose plan" button fills the textarea with a clear summary; "Copy summary" uses the Clipboard API; "Download .txt" saves a text file.
- Scroll reveal: sections using the class "reveal-on-scroll" animate into view via IntersectionObserver. If the user has prefers-reduced-motion set to 'reduce', reveals are applied instantly for accessibility.
- Safety-first copy: FAQ and planner include explicit safety reminders (patch tests, dilution guidance, pregnancy/pets notes). All health-related language uses conservative "may support" phrasing and avoids medical claims.
- Navigation labels intentionally differ from typical templates (Begin, Guides, Blends, Shop, Investment, Who I Am, Book, Connect).
- The page references assets/img/pattern.svg for an SVG tiled background motif — ensure the asset exists in the project (unique pattern created elsewhere in the bundle).

Placeholders present (leave as-is for templating):
- {{BUSINESS_NAME}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{CITY}}
- {{STATE}}

Accessibility & dev notes:
- No external fonts or CDNs are used; styling is local and relies on system fonts.
- The reveal logic respects prefers-reduced-motion and uses a small intersection threshold for a gentle entrance.
- Session Planner avoids inline backslash escapes in code and builds newline sequences programmatically (String.fromCharCode) to keep the file portable and JSON-safe.

How to test locally:
1. Place contact.html into the site's root alongside other pages (index.html, about.html, book.html, etc.).
2. Ensure assets/img/pattern.svg exists and is reachable.
3. Open contact.html in a browser. Scroll to observe reveal animations; toggle OS-level reduced motion to confirm accessibility behavior.
4. Use the Session Planner: choose options, click "Compose plan", then try "Copy summary" and "Download .txt".
5. Submit the contact form to observe the stubbed response behavior.

Design intent:
- Clean, minimal, and calm interface that aligns with a "zen_minimal" layout family and a "mystic_modern" voice: language leans mystical but grounded, without making medical claims.

If you need this contact page adapted into another layout variant or to include server-side form handling hooks, tell me which endpoint or framework to target and I will update the form markup and scripts accordingly.