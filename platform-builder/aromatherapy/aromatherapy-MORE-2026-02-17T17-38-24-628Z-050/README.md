Contact page for the aromatherapy site (clinic_modern layout).

Files in this bundle:
- contact.html — full contact page with interactive widgets.

Placeholders present (replace when deploying):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Key features implemented:
- Mood-to-Method selector: choose a current mood; the recommendation card updates its title, description, CTA label, and appends a 'method' query parameter to the booking URL.
- Pricing Comparator toggle: switches between "Per Session" and "Package" and animates numeric price transitions smoothly.
- Contact form: local handler prevents submission and shows a confirmation alert (stub for real integration).

Accessibility and safety notes:
- Copy uses safe language ("may support") and includes guidance on dilution, patch testing, pregnancy, pets, and children in the FAQ.
- No external assets required in this chunk; the page references assets/img/pattern.svg for a repeating background — ensure that file exists in the assets path in the final build.

Design and behavior details:
- Navigation labels differ from typical templates: Studio, Offerings, Formulations, Boutique, Plans, Story, Reserve, Reach.
- Mood-to-Method mapping is declared in the inline script and can be extended.
- Pricing cards store both a data-month and data-package attribute. The toggle reads these and animates to the target value.

How to test locally:
1) Open contact.html in a browser.
2) Click mood buttons to see the method preview and CTA change. The CTA link will include ?method=<key>.
3) Toggle "Per Session" vs "Package" to watch prices animate.
4) Submit the contact form to see the local success alert.

Customization tips:
- Replace placeholders with real values in a build step or templating engine.
- Hook the form submit to your server or a service like Netlify Forms by adding an action and removing the local preventDefault if desired.
- Ensure assets/img/pattern.svg is present for the background pattern; create a unique SVG with branding motifs if needed.

Safety reminder: All copy that references benefits is intentionally cautious. Avoid making clinical or diagnostic claims in any content derived from this page.