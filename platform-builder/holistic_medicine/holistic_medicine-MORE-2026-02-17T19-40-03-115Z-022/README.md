Contact page for the holistic_medicine site (chunk 4).

Files included:
- contact.html — the Connect page with two local interactive tools: Session Planner and Whole-person Inventory.

What the page does:
- Session Planner: lets a visitor enter a primary goal, select session length and frequency, choose modalities, and add brief notes. "Create summary" builds a plaintext plan suitable to copy or download as .txt.
- Whole-person Inventory: a checklist of life areas produces a suggested consultation agenda and a follow-up cadence algorithmically based on how many areas are selected. Both agenda and cadence can be copied to clipboard.

Placeholders used (replace in final build):
- {{BUSINESS_NAME}}  - practice name
- {{TAGLINE}}        - short tagline
- {{PHONE}}          - phone number
- {{EMAIL}}          - contact email
- {{PRIMARY_CTA_LABEL}} - primary CTA label text
- {{PRIMARY_CTA_URL}}   - primary CTA URL
- {{CITY}}           - city
- {{STATE}}          - state

Notes for integrators:
- The page references an inline SVG pattern; the project also expects a local decorative asset at assets/img/pattern.svg in the full bundle if you prefer an external file.
- All interactive code is local JS inside contact.html; no external libraries required.
- The content and CTAs are intentionally minimal and poetic; adjust copy to match your clinic voice while keeping clinical disclaimers where appropriate.

Seed: 135348715
Layout family: split_diagonal
Voice family: minimal_poetic
Offer model: hybrid
Section pack: hero,gallery,what_to_expect,objections,cta

Copyright: template for integrative/holistic medicine. No medical guarantees; the tools are preparatory for clinical conversation.