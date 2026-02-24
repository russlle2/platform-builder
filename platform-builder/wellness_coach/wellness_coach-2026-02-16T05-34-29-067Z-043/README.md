Contact page for the wellness coach site (chunk 4)

Overview:
- Files in this chunk: contact.html, README.md
- Purpose: Contact and lead-capture page with hero, values, methods, objections, testimonials, lead magnet and clear CTAs.
- Design family: earthy_warm — warm palette, organic shapes, friendly cards, soft radii.
- Voice: executive coach — energetic, outcome-focused, practical.

Placeholders used (replace when deploying):
- {{BUSINESS_NAME}}
- {{TAGLINE}} (not shown on this page but available site-wide)
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{COACH_NAME}}
- {{CREDENTIALS}}
- {{CITY}}
- {{STATE}}

Notes for developers:
- The page contains inline SVGs for the hero, avatar snippets and pattern to meet the requirement for unique local illustrations. No external assets or fonts are referenced.
- The contact form posts to {{PRIMARY_CTA_URL}} by default (set the URL to your form handler or CRM endpoint). The lead magnet form uses a client-side stub and can be wired to a mailing list provider.
- All copy avoids medical claims and focuses on outcomes, habits and frameworks.

Customization:
- Color variables are at the top of the <style> block (CSS variables). Adjust --accent and --accent-2 for brand color updates.
- Max content width is controlled with --max.
- To change programs/options in the contact dropdown, edit the <select id="interest"> options.

Accessibility & behavior:
- Forms include basic required attributes and small client-side validation. Replace with server-side validation and CAPTCHA as needed.
- The contact form allows traditional POST as well as progressive enhancement for AJAX.

Sections included on this page (and required across the site):
- hero — demonstrates primary value and CTA
- values — core principles
- methods — frameworks and approaches
- objections — common questions answered
- testimonials — short teasers linking to the full testimonials page
- lead_magnet — email capture for a free guide
- cta — strong footer call-to-action with contact methods

Integration tips:
- Replace the placeholders during build (templating engine, static replacement or CI).
- Connect POST target ({{PRIMARY_CTA_URL}}) to your CRM, Zapier, or server endpoint. Include relevant hidden fields if needed (utm_source, page, etc.).
- If you need separate SVG asset files, extract the inline <svg> blocks into files under assets/img/hero.svg, assets/img/avatar.svg and assets/img/pattern.svg and update the <img> or <use> references.

Deployment checklist:
- Update placeholders with real values.
- Provide server endpoint for contact form or integrate with an email provider.
- Verify privacy and consent wording aligns with your policies.

Contact for handoff:
- This page was created for the wellness coach site (earthy_warm). If you need alternate layout variants, update the header nav labels and hero copy to match other pages.
