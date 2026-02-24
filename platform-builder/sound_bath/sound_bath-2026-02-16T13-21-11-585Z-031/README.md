Project chunk: contact + README

Niche: Sound Bath Events (sound_bath)
Slug: sound_bath-2026-02-16T13-21-11-585Z-031
Seed: 2770853913
Layout family: zen_minimal
Voice: warm_storyteller
Offer model: membership

Files included in this chunk:
- contact.html (primary contact page for the site)
- README.md (this file)

Purpose
- contact.html is a sensory, premium contact page tailored for a sound bath events site. It contains an accessible contact form, membership CTA, practical details (what to bring, contraindications), flow description, quick event details, and a small FAQ.

Design notes
- Visual richness is created through CSS gradients, layered card surfaces and an inline SVG background pattern. No external assets or CDNs are used.
- The background SVG is embedded directly in contact.html (the unique pattern lives inside the page). If you prefer a dedicated asset, extract the <svg> to assets/img/pattern.svg and reference it as needed.
- Navigation labels are intentionally varied (Gather, Rituals, Sessions, Membership, Our Story, Questions, Reach) to meet the uniqueness requirement across site pages.
- The page includes placeholders that must be replaced by your templating system or a simple search/replace:
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}
  - {{FACILITATOR_NAME}}
  - {{VENUE_NAME}}
  - {{NEXT_EVENT_DATE}}

Accessibility & UX
- Form fields include labels via placeholders and aria attributes for clarity.
- Color contrast kept high for primary text; decorative SVG includes aria-hidden to avoid noise for assistive tech.
- Mobile queries collapse the grid to a single column and hide the full nav for clarity.

Behavior
- The contact form uses a mailto action for demo purposes; in production replace the form action with your API endpoint or form handling service.

How to use
1. Drop contact.html into your site root or template folder.
2. Replace placeholders with actual values or wire up your templating engine.
3. If you want the background as a standalone file, extract the inline SVG block to assets/img/pattern.svg and reference it with CSS or an <img> tag.

Chunk rules compliance
- Contains sensory language, what to bring, contraindications, and flow description.
- Membership CTA is prominent and links to {{PRIMARY_CTA_URL}}.
- Instruments vary and are listed (crystal bowls, gong, chimes, tuning forks).

Editing tips
- To change the instrument list or event details, edit the quick details block.
- To adapt the tone, update the copy in the hero and ritual sections.

Contact
- For further iterations (other pages in the site), replicate the visual patterns and vary headings/structure to maintain uniqueness across templates.

End of README.