# Contact Page — holistic_medicine (chunk 4)

Files in this bundle:
- contact.html — The responsive contact page for the site. Includes the contact form, a Proof Gallery (rotating testimonials with credential badges and accessible tooltips), and a Pricing Comparator microinteraction that toggles between monthly and package pricing with animated numbers.

How to use / customize:
- Replace placeholders in the HTML with your values:
  - {{BUSINESS_NAME}} — your business name
  - {{TAGLINE}} — (optional) short tagline
  - {{PHONE}} — primary phone number
  - {{EMAIL}} — contact email
  - {{PRIMARY_CTA_LABEL}} — label for form CTA button (e.g., "Send request")
  - {{PRIMARY_CTA_URL}} — (not wired) placeholder available for other pages
  - {{CITY}} / {{STATE}} — location text

Accessibility & behavior notes:
- Proof Gallery: rotates testimonials every 5 seconds and can be manually selected by clicking the dots. Badges show a descriptive tooltip on hover or keyboard focus.
- Pricing Comparator: two buttons toggle "Monthly" vs "Package" pricing. Numbers animate smoothly between states to emphasize differences.
- Form: the primary CTA simulates sending and returns a friendly alert. It's intentionally local-only to keep the bundle self-contained.

Design & implementation details:
- Uses glass-morphism styling with a subtle SVG-based background (assets/img/pattern.svg). No external fonts or CDNs are referenced.
- All interactions use vanilla JS, no frameworks.
- The page avoids medical guarantees and keeps an educational/supportive tone; modify copy as needed to meet your practice's compliance standards.

Integration pointers:
- Ensure assets/img/pattern.svg exists in your site's assets folder. The same project should include other pages (index.html, services.html, etc.) referenced in the header nav.
- For production, wire the form to your preferred backend or scheduling tool and replace the simulated alert with a real submission flow.

License: This bundle is provided as-is for integration into the holistic_medicine site layout family. Adjust branding, copy, and behavior to suit your practice's policies and local regulations.
