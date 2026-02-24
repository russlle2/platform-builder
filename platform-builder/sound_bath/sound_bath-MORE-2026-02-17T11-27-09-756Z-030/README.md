Contact page and usage notes for the sound_bath site (chunk 4).

Files in this bundle:
- contact.html — The full contact page. Contains an inline SVG background (embedded as a data URL), navigation, a Session Planner interactive widget, a mock Event Seat Selector with packing-list generator, a next-event module, a contact form (local), and contraindications disclaimers.

Placeholders present in contact.html (replace these when building):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Interactive features (local, no server):
- Session Planner: fill fields and click "Compose Plan" to generate a plaintext plan. "Copy Summary" copies to clipboard.
- Seat selector: click mock seats to select/unselect. A packing list updates based on selection. "Copy List" copies it; "Email List" opens mailto: with the list.
- Contact form: simulated send (client-only) displays queued message text.

Design notes:
- The SVG pattern is embedded in the page (data URL). No external assets are included.
- Accessibility: simple ARIA labels and live regions are used for dynamic outputs.
- Contraindications: a clear, responsible disclaimer is included.

Integrate guidance:
- Replace placeholders server-side or during build.
- The planner output and lists are plain text so they can be pasted into emails or booking records.

If you need the pattern as a separate file (assets/img/pattern.svg), extract the SVG code from the inline data URL in the contact.html background style and save it as a standalone file, then update the CSS background url accordingly.

End of chunk 4 README.