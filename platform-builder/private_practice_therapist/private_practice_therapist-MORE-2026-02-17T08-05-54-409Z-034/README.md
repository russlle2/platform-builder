Contact page (contact.html)

Files in this bundle:
- contact.html — the full contact page for the private practice site.

How to use:
- Drop contact.html into your site folder alongside the other pages (index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html).
- Replace placeholders ({{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}) with real values.
- The page references a local SVG pattern at assets/img/pattern.svg for decorative purposes; ensure that asset exists in your project.

Key features implemented:
- Mood-to-Method selector: choose a current state from the small set of moods and the page updates a recommended approach title, description, and the action CTA. The CTA link includes a mood query parameter so scheduling/book flow can be aware of the selected mood.
- Session boundaries & confidentiality accordion: three accessible accordion sections covering scope of work, confidentiality, and limits/coordination. Each summary is keyboard-operable (Enter/Space) and toggles expanded content.
- Crisis footer: a respectful, clear note describing what to do if in immediate danger and directing to local emergency services and crisis lines; follows clinician-style wording without making medical claims.
- Contact form: a simple, client-side form that simulates submission with a friendly acknowledgement and resets the form. Replace with your backend or email integration as preferred.

Design & accessibility notes:
- Visual approach leans into a bold_playful layout (rounded cards, warm accent) with an emphasis on calm, clinician-focused copy.
- Navigation uses a slightly different label set to avoid repetition: Home, My Story, What I Help With, My Way, Rates & Options, Questions, Book, Reach.
- All interactive elements include basic keyboard support (accordion summaries). Color contrast was considered but should be reviewed against WCAG for your exact brand colors.

Privacy & clinician considerations:
- The page includes a clinician-oriented confidentiality statement and explicit limits of confidentiality (risk to self/others, abuse, court orders) in non-alarming language.
- No promises or medical claims are made; content uses supportive, grounded phrasing consistent with therapeutic practice.

Customization suggestions:
- Hook the form to your scheduling or secure messaging backend. Consider adding server-side validation and spam protection.
- Swap the hero pattern or adjust the palette variables in the <style> block to match your brand.
- Expand the accordion with a full privacy policy document and a downloadable copy upon request.

If you want, I can:
- Provide a version with a connected form endpoint (example Node/Express or static Netlify function).
- Generate the pattern SVG asset (assets/img/pattern.svg) to match this page's decorative style.
