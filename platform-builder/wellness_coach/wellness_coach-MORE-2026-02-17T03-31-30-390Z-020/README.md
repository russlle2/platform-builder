Project: wellness_coach-MORE-2026-02-17T03-31-30-390Z-020

Niche: Wellness Coach
Layout family: bold_playful
Voice family: mystic_modern
Offer model: intensive
Section pack: hero,story,framework,offers,pricing,testimonials,cta

Files in this chunk:
- contact.html
- README.md

Purpose
This chunk provides the contact page for the wellness coach site. The page includes two interactive features implemented with local JavaScript:

1) Mood-to-Method selector
- Choose a mood (or press keys 1-5) to see an adaptive recommendation.
- The method title, description, and the main CTA label update instantly.
- The CTA links to {{PRIMARY_CTA_URL}} and appends a mood query parameter.

2) 30-day Progress Path Map
- Pick up to 4 goals from the "Build your path" area.
- The page renders a 30-day visual distribution (an SVG path of circles) assigning a focus to each day in a rotating pattern.
- Hover a day to see a tooltip; click a day for a quick plan note.
- Metrics show a simple "Monthly focus density" and a suggested sprint label.

Placeholders
The following placeholders appear in the HTML and should be replaced during deployment:
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not used on this page but available globally)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Notes
- No external assets or CDNs are required. The layout references an SVG pattern at assets/img/pattern.svg for background texture.
- Copy and metaphors avoid reuse of specified forbidden phrases and aim for distinct structure and CTAs.
- The page focuses on outcomes, habits, and frameworks only (no medical claims).

How to test locally
1) Place this file and contact.html in the project folder (maintain links to other pages if you have them).
2) Open contact.html in a modern browser.
3) Try the Mood-to-Method panel (or press 1-5) and observe the CTA text and href change.
4) Select up to four goals in Build your path and inspect the rendered 30-day map. Hover/click day nodes to view details.

Accessibility & small interactions
- Radio inputs and checkboxes provide keyboard interaction.
- Tooltips appear on hover; the path map nodes are clickable for quick notes.

If you need additional pages, assets, or a unique pattern SVG, add assets/img/pattern.svg to match the site’s visual tone.