Contact page for private practice therapist website (chunk 4).

Files included:
- contact.html — the contact/connect page with two interactive tools:
  - Session Planner: choose focus, session length, frequency, and top concerns; build a plain-text plan, copy it, or download as .txt.
  - Self-screening intake wizard: select present areas, duration, and priority; generate a short intake note plus suggested questions to bring to consultation; copy to clipboard.

How to use:
1. Open contact.html in a modern browser (no server required).
2. Use the Session Planner form on the left to compose a concise session plan. Click "Build plan" to preview, "Copy summary" to copy to clipboard, or "Download .txt" to save the plan locally.
3. Use the Self-screening intake wizard to generate an intake note and a set of suggested questions you might bring to a first meeting. Click "Generate intake note" then "Copy questions" as needed.

Notes & considerations:
- All tools run locally in the browser. Nothing is sent to a server by default; copying or downloading is performed by the user.
- Content uses placeholders for business-specific details. Replace:
  - {{PRIMARY_CTA_LABEL}} and {{PRIMARY_CTA_URL}}
  - {{PHONE}} and {{EMAIL}}
  - {{CITY}} and {{STATE}}
  - Any other site pages (links in the header) point to the expected pages in the project.
- Confidentiality & scope language is included on the page. The page explicitly notes that the tools are preparatory and not diagnostic. Crisis guidance is provided; the page is not a crisis service.

Customization:
- Edit the select options and copy in the HTML to change the framing, priorities, or question suggestions.
- The inline styles provide an earthy-warm palette; modify CSS variables at the top of the file to tune colors.

Accessibility & behavior:
- Buttons and fields are keyboard accessible. Copy actions use the Clipboard API; this requires a secure context for some browsers.

Developer notes:
- No external assets are required. The page uses an inline SVG pattern for subtle background texture.
- Keep the legal/clinical disclaimers if adapting the page for a live site.

If you need the pattern as a separate asset, or additional pages for the site, request the next chunk and list which files to include.