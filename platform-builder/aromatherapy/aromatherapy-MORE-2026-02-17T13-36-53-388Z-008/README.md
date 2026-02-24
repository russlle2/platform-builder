Contact page and notes for the aromatherapy site

This chunk provides two files:

1) contact.html
- A full contact page designed for an aromatherapy practitioner site.
- Includes a Mood-to-Method selector: pick a current state (Rattled, Fuzzy, Tense, Light) and the page updates a recommended approach card, CTA label and URL. The interaction is accessible (keyboard + click) and animates content changes.
- Includes a Pricing Comparator: toggle between "Monthly" and "Package" views. Prices animate between values using requestAnimationFrame and an ease-out cubic curve.
- Safety-forward FAQ section covering dilution/patch test, pregnancy, and pets (no medical claims; language uses "may support").
- Uses placeholders for site-level data: {{BUSINESS_NAME}}, {{TAGLINE}}, {{PHONE}}, {{EMAIL}}, {{PRIMARY_CTA_LABEL}}, {{PRIMARY_CTA_URL}}, {{CITY}}, {{STATE}}.
- No external assets are loaded; the page references assets/img/pattern.svg for a repeated svg background (unique pattern file expected elsewhere in the bundle).

2) README.md (this file)
- Explains features and interactive behavior.

Notes for integration:
- The Mood-to-Method items update the CTA text and href. Default CTA values fall back to the provided placeholders.
- The pricing numbers use data-month and data-package attributes on elements with class "price-number"; the script reads those and animates the display.
- Ensure assets/img/pattern.svg is present and unique in the final build to provide the background motif.

Accessibility & safety:
- Controls are keyboard-accessible; mood options respond to Enter/Space and have focus styles.
- Safety notes are included in the FAQ and should be reviewed by the practitioner for completeness.

If you need this page adapted to another layout or to remove the pattern reference (for environments without assets), ask and it will be adjusted.