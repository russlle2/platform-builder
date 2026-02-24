Contact page chunk (holistic_medicine) — chunk 4

What this bundle contains:
- contact.html: A complete contact page built with a glass-morphism aesthetic and a unique inline SVG pattern for decorative background. The layout is responsive and intentionally calm/clinical in tone.

Design & UX notes:
- Layout family: glass_morphism — frosted panels, soft shadows, semi-transparent cards, backdrop-filter blur to evoke an approachable clinical calm.
- Voice family: clinical_calm — language emphasizes education, shared decision-making and whole-person care; avoids promises or cure guarantees.
- Offer model: hybrid — page references both telehealth and in-person options and a combined "guide + consult" lead magnet.
- Required sections included (hero, social_proof, benefits, process, faq, lead_magnet, cta). They are arranged to prioritize contact and practical next steps while offering contextual education and testimonials.

Technical notes for integration:
- Placeholders used (must be replaced during build or server-side rendering):
  - {{BUSINESS_NAME}}
  - {{TAGLINE}}
  - {{PHONE}}
  - {{EMAIL}}
  - {{PRIMARY_CTA_LABEL}}
  - {{PRIMARY_CTA_URL}}
  - {{CITY}}
  - {{STATE}}
  - {{PRACTITIONER_NAME}}
  - {{CREDENTIALS}}

- The contact form is a front-end demo. The form action uses the PRIMARY_CTA_URL placeholder and the onsubmit handler currently shows a demo alert. Replace with a real endpoint, booking URL, or integrate with your scheduling API.
- Decorative SVG is embedded inline to avoid external asset dependencies. If you prefer a separate asset file, extract the <svg> block to assets/img/pattern.svg and reference it as a background-image or inline object.

Holistic medicine compliance reminders:
- The copy avoids guarantees or claims of cures. It includes explicit language that submitting the form does not create a doctor-patient relationship and notes emergency instructions.
- If you add condition-specific content elsewhere (conditions page), ensure you include disclaimers and focus on education and symptom support.

Accessibility & progressive enhancement:
- Uses semantic HTML where practical; form controls are labeled. Provide server-side validation and ARIA states if you add dynamic behaviors.
- Keep contrast high for text; the design aims for readability on dark background.

Customization pointers:
- To change the visual accent, update the --accent1 and --accent2 gradients in the <style> block.
- To switch to an external SVG asset, move the inline SVG to assets/img/pattern.svg and replace the <svg class="svg-backdrop"> element with a CSS background on body, e.g. background-image: url('/assets/img/pattern.svg'); background-size:cover;.
- To wire the CTA, set PRIMARY_CTA_URL to your booking flow and PRIMARY_CTA_LABEL to an action such as "Request Consult" or "Schedule Visit".

Testing:
- Verify mobile layout at widths down to 320px.
- Confirm mailto: and tel: placeholders are replaced and functional.

Notes for the rest of the site:
- Keep nav labels varied across pages to meet uniqueness requirements (this file uses "Our Approach" and "Book" rather than uniform labels).
- Make sure conditions.html lists common concerns (stress, sleep, digestion, inflammation, energy) and includes educational disclaimers.

If you need the SVG exported as a standalone file or variations for other pages, I can generate assets/img/pattern.svg and alternative palettes for different templates.