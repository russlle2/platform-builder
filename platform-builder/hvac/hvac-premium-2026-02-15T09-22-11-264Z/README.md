# HVAC Premium Website Template

A modern, responsive, multi‑page template for HVAC businesses. Designed to be fast, accessible, and conversion‑focused. Works fully offline — no external fonts, images, or CDNs.

## Quick start (local)
1. Download or clone this repository.
2. Open `index.html` in your browser.

## Deploy to Netlify
1. Push the template to your Git repository (GitHub/GitLab/Bitbucket).
2. Sign in to Netlify and click “New site from Git”.
3. Select your repository and deploy. No build step required (static site).
4. Optional: Set up a custom domain and HTTPS in Netlify.

## Customize business details
Replace the placeholder tokens throughout the HTML with your real business info. You can search the project for `{{` to find all placeholders.

Placeholders to replace:
- `{{BUSINESS_NAME}}`
- `{{TAGLINE}}`
- `{{PHONE}}`
- `{{EMAIL}}`
- `{{ADDRESS}}`
- `{{CITY}}`
- `{{STATE}}`
- `{{ZIP}}`
- `{{HOURS}}`
- `{{PRIMARY_CTA_URL}}`
- `{{PRIMARY_CTA_LABEL}}`

Tips:
- Use international format for phone numbers to ensure mobile click‑to‑call works well.
- Keep the tagline short and benefit‑driven.
- Point `{{PRIMARY_CTA_URL}}` to your preferred action (e.g., `/book.html` or an external scheduling link).

## Pages included
- `index.html` (Home)
- `services.html` (HVAC services overview)
- `pricing.html` (Transparent pricing and checkout‑like form)
- `financing.html` (Payment and financing options)
- `about.html` (Story, team, values)
- `reviews.html` (Testimonials and ratings)
- `book.html` (Booking form)
- `contact.html` (Contact details and form)

## Assets
- System font stack only (no external fonts)
- Images included locally:
  - `/assets/img/hero-abstract.svg` (hero/OG image)
  - `/assets/img/avatar-01.svg` (avatar placeholders)

## Accessibility & performance
- Semantic HTML with clear heading structure
- High‑contrast buttons and focus outlines
- Reduced motion support
- Mobile‑first responsive layout
- Sticky mobile CTA for quick conversions

## Forms
All forms are static and demonstrate structure/fields only. By default, they do not submit anywhere. To enable real submissions:
- Use Netlify Forms: add `netlify` and `name` attributes to forms and inputs.
- Or connect to your preferred form handling service or backend.

Example (Netlify Forms):
```html
<form name="booking" method="POST" data-netlify="true">
  <input type="hidden" name="form-name" value="booking" />
  <!-- your fields -->
</form>
```

## SEO
- Descriptive titles and meta descriptions
- Open Graph tags using the local hero image
- LocalBusiness JSON‑LD with your contact details (home page)

## Customization tips
- Colors and spacing are defined in `/assets/css/styles.css` under `:root` variables.
- The sticky mobile CTA can be adjusted or hidden via the `.sticky-cta` styles.
- Navigation is duplicated across pages for a static build; consider a templating system if you plan frequent changes.

## License
This template is provided as‑is, free for commercial use. No attribution required.
