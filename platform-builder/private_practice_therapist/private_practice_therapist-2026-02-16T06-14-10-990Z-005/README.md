Contact page and guidance for the private practice site

Files included in this chunk:
- contact.html — Full contact page built for the clinic_modern layout. Includes a two-column hero, contact form, confidentiality and crisis disclaimers, summarized myth_vs_truth, pillars, case studies, FAQ, and a final CTA.

Placeholders (must be replaced during deployment):
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{THERAPIST_NAME}}
- {{LICENSE}}
- {{MODALITIES}}
- {{CITY}}
- {{STATE}}

Notes and requirements:
- The contact form posts to {{PRIMARY_CTA_URL}} by default; adapt action to your form handler or mailer integration as needed.
- The page contains mandatory clinician safety copy: confidentiality statement, crisis disclaimer, and scope/boundaries language. Do not remove these sections.
- Design follows the clinic_modern brief: a calm palette, crisp grid, and precise components. Styles are self-contained in a <style> block; no external fonts or CDNs used.
- The site expects three SVG assets to exist in assets/img/ (hero.svg, avatar.svg, pattern.svg). Include unique SVGs per template in the assets folder in your build so other pages can reference them.

Accessibility & legal:
- Forms include labels and required attributes to assist with client intake.
- The copy avoids medical claims and frames outcomes in supportive, non-guaranteed language.

Integration suggestions:
- Replace placeholders with real values server-side or via a simple templating step before publishing.
- If you use a static site generator, this contact.html can be a template; ensure the form action and links point to correct routes.
- For scheduling, link {{PRIMARY_CTA_URL}} to your booking flow (internal page or third-party scheduler).

Customization ideas:
- Add server-side validation and an anti-spam honeypot field for the form.
- Add a small embedded calendar for members-only slots if using a membership program.

Contact for maintainers:
- This chunk was generated for a private practice therapist template (programModel: membership). For further edits (tone, clinical copy), coordinate with a supervising clinician to ensure ethical accuracy.