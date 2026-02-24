Contact page for the private practice therapist site (layoutFamily: clinic_modern).

What this file contains:
- contact.html: a self-contained contact page with an interactive pricing comparator and a Mood-to-Method selector. It adapts the primary CTA text according to the user's selected mood and animates price numbers when toggling between monthly and package views.

Key features and behaviours:
- Pricing Comparator: toggle between 'Monthly' and 'Focused package' views. Numbers animate smoothly to communicate relative cost differences for brief sessions and a focused program.
- Mood-to-Method selector: four mood states (Overwhelmed, Stuck, Transitioning, Coping) that morph the suggested approach blurb and update the main CTA button text to match a logical next step.
- Contact form: captures name, email, phone and a short note. Form submission is simulated in-page and displays a confirmation alert. The form explicitly notes it is not for emergencies.
- Accessibility notes: buttons are standard elements, meaningful labels are present, and color contrasts are chosen for legibility.

Placeholders to be provided by the site generator/environment:
- {{BUSINESS_NAME}}
- {{TAGLINE}}
- {{PHONE}}
- {{EMAIL}}
- {{PRIMARY_CTA_LABEL}}
- {{PRIMARY_CTA_URL}}
- {{CITY}}
- {{STATE}}

Clinical and legal language included:
- Confidentiality summary, boundaries, and a clear crisis/emergency notice.
- No medical claims; language is supportive and grounded.

Integration notes:
- Nav links assume the rest of the site pages exist at the top-level: index.html, about.html, specialties.html, approach.html, fees.html, faq.html, book.html, contact.html.
- No external assets or CDNs are used. The page references a local pattern asset (assets/img/pattern.svg) optionally for background treatment in the broader site but does not require it to function.

Developer guidance:
- The pricing values are defined in PRICING at the top of the script and can be adjusted to match the clinician's actual fee structure.
- The METHODS mapping drives mood->approach copy and CTA suffixes. Update to reflect clinical offerings and tone.
- The submit handler is a placeholder; integrate with your backend form endpoint or email workflow as needed.

This page is intended to feel practical and calm while giving visitors a clear starting point for contacting the clinician and understanding possible next steps.