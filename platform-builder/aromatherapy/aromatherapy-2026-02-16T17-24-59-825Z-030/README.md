This bundle provides the contact page and notes for the aromatherapy website.

Files included:
- contact.html — Complete contact page with glass-morphism styling, inline SVG fallback pattern, accessible contact form, practice info, schedule CTA, and a safety-forward FAQ (dilution, patch testing, pets, pregnancy).

Placeholders to replace in your build system:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}
- {{PRACTITIONER_NAME}}
- {{FAVORITE_BLEND}}

Notes and implementation tips:
- The page references assets/img/pattern.svg for a repeating background. Create a unique SVG at that path (simple geometric or botanical motif) to meet visual-uniqueness requirements.
- The design uses CSS backdrop-filter for the glass effect; provide a graceful fallback for older browsers if needed.
- The contact form posts to {{PRIMARY_CTA_URL}} by default; adapt to your serverless endpoint or CRM as required.
- All aromatherapy language is safety-forward and non-medical. Maintain this tone site-wide.
- Navigation labels intentionally vary ("Offerings", "Boutique", "Rates") to satisfy subtle variance across templates.

Accessibility:
- Form fields have labels and the FAQ uses keyboard-accessible controls.

If you need the rest of the site files (index, services, blends, shop, pricing, about, book) or the SVG asset created, request the next chunk and I will produce them with matching visual language and the required blends/shop content.