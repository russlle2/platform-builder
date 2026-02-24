# contact.html — chunk 4

This bundle contains two files for the sound bath site slice focused on contact and planning tools.

Files:
- contact.html: The contact and interactive planning page. Includes:
  - Header/navigation with unique label set: Home, Gatherings, Sessions, Invest, Story, Plan, Connect.
  - Split-diagonal hero with CTA placeholders: {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}.
  - Session Planner widget:
    - Format, duration, focus, facilitator options.
    - Instrument toggles.
    - Note field.
    - Build plan, copy to clipboard, download plaintext (.txt) export.
    - Planner output uses placeholders: {{CITY}}, {{STATE}}, {{EMAIL}}, {{PHONE}}.
  - Event seat selector and seat map:
    - Fake seat map rendered in-browser.
    - Click seats to select; selected seats update guest count.
    - Generate packing list tailored to mat preference, event type, and guest count.
  - Contraindications guidance block: responsible disclaimers for epilepsy, implanted devices, pregnancy, psychiatric conditions, or cardiac conditions.
  - Decorative inline SVG pattern embedded locally — satisfies no external asset requirement.
  - Contact form placeholder and direct contact links using {{EMAIL}} and {{PHONE}}.

Notes for developers:
- All interactive logic is local and included inline in contact.html; no external JS or network requests.
- Placeholders to be replaced by server-side or build-time templating: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- The page intentionally avoids external fonts and assets; the SVG pattern is embedded for visual texture.
- Uses accessible controls where practical; seat buttons are keyboard-focusable and use aria-disabled when marked full.
- The session planner export is plain text to be easily copy/pasted into emails or booking notes.

How to run locally:
- Drop contact.html into any static server or open in a modern browser from disk. The copy and download functions use browser clipboard and blob APIs; they work in recent versions of Chrome, Firefox, Safari, and Edge.

Design decisions and constraints:
- No external CDNs or images used.
- Unique nav labels and CTAs to satisfy uniqueness requirements.
- The page order and sections differ from other pages to meet variation constraints.
- Tone and microcopy follow an executive and precise voice, with sharper, compact prompts and actions.

If you need additional assets or the svg file split out to assets/img/pattern.svg, create the file and update the reference in the template. Currently the pattern is embedded to respect this chunk's generation limits.
