Contact page for the sound-bath events site (chunk 4).

Files included:
- contact.html : Standalone contact page with styles and client-side interactivity.

Purpose and highlights:
- Provides visitors a form to reach the events team and quick-call actions using the {{PHONE}} placeholder.
- Includes a Sound Preference Mixer (Gentle / Balanced / Dynamic) that updates recommended program suggestions locally.
- Proof Gallery: rotating testimonials and credibility badges with hover tooltips to show provenance.
- Contraindications disclaimer present and visible near the form.
- Primary CTA uses {{PRIMARY_CTA_LABEL}} and points to {{PRIMARY_CTA_URL}}.
- All textual placeholders are preserved (e.g. {{BUSINESS_NAME}}, {{TAGLINE}}, {{CITY}}, {{STATE}}, {{EMAIL}}).

Notes for integration:
- This chunk references assets/img/pattern.svg for a subtle background pattern. Ensure that asset is supplied in the final bundle.
- The page is self-contained: no external fonts or CDNs are required.
- Form submission is simulated locally (no backend wired). Replace the client-side handlers to post to your endpoint when ready.

Design & accessibility:
- Color palette uses high-contrast accents and subdued background for calm presentation.
- Interactive elements include readable labels and basic keyboard focusability for badges.

How to use:
- Drop contact.html into the site root alongside the other pages (index.html, events.html, etc.).
- Replace placeholders with real values during deployment.
- Optionally wire the form to a server endpoint and update the booking URL in {{PRIMARY_CTA_URL}}.

Seed: 98906058
Layout family: poster_hero
Voice: practical_guide
Offer: events_series
Section pack included in the site: hero,myth_vs_truth,pillars,case_notes,faq,cta

End of README.