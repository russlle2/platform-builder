Contact page and usage notes for the wellness coach site bundle.

Files in this chunk:
- contact.html: A full contact + lead magnet page tailored to an "earthy_warm" design. It includes all required sections: hero, values, methods, objections, testimonials, lead_magnet, cta.

Placeholders to replace in your build or templating system:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{COACH_NAME}}
- {{CREDENTIALS}}
- {{CITY}}
- {{STATE}}

Notes on behavior and assets:
- The page references three local SVGs expected in assets/img/: hero.svg, avatar.svg, pattern.svg. Ensure those files are present in the final build.
- The contact form and lead magnet form attempt a POST to {{PRIMARY_CTA_URL}}. If you do not have a backend endpoint, the script will silently fall back and still show a success message locally.
- No external fonts, CDNs, or analytics are included. All styling is inline to keep the page self-contained.

Styling & accessibility:
- Uses system fonts and accessible form fields with aria-labels.
- Buttons and links are keyboard-focusable; details/summary is used for compact FAQ entries.

Customization:
- Update colors and radii in the :root CSS variables to match brand preferences.
- To wire the forms, point {{PRIMARY_CTA_URL}} to your API endpoint that accepts JSON POSTs for contact/lead events.

If you need a variant with server-side form handling or additional animated SVGs, request the next chunk for assets and supporting pages.