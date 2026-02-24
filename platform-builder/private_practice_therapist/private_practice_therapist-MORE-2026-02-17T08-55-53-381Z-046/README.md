Contact page and utilities for the private practice template.

Files in this bundle:
- contact.html — The contact page with interactive tools and practice info.

Purpose:
- contact.html contains an accessible contact form (local, non-sending), a Session Planner widget, and a Self-Screening Intake Wizard.

Features:
- Session Planner: Select focus, rhythm, short-term goals, and constraints. Click "Create plan" to generate a plaintext summary in the plan area. Use "Copy summary" to copy to clipboard and paste into email or a scheduling form.
- Self-Screening Intake Wizard: A multi-step, non-diagnostic intake helper that prompts for reason for seeking help, current experiences, past helpful strategies, concerns about starting therapy, and practical details. "Generate notes" compiles responses and provides suggested consult questions. "Copy notes" copies the generated text.

Notes for use:
- All interactions are local to the page; no data is transmitted by the included scripts.
- Replace placeholders in the HTML (e.g. {{BUSINESS_NAME}}, {{PHONE}}, {{EMAIL}}, {{CITY}}, {{STATE}}, {{PRIMARY_CTA_LABEL}}) with your practice details.
- The contact form's primary CTA prepares a brief message summary in the Session Planner area for convenience; it does not send an email.

Clinical and compliance reminders (content included in contact.html):
- The page includes confidentiality/context language, scope boundaries, and a clear crisis note. Do not present the wizard as diagnostic or as emergency care.
- Avoid making guarantees or medical claims in replaced copy.

Accessibility & progressive enhancement:
- The page uses simple HTML form controls and ARIA-live regions for generated summaries so screen reader users receive updates.
- Copy-to-clipboard uses the Clipboard API with graceful alert fallbacks.

Customization tips:
- You can adapt the Session Planner options, add more goals, or connect the contact form to a secure practice management system.
- If you host an assets SVG pattern at assets/img/pattern.svg, the header attempts a subtle patterned look; you can replace or extend styles in the head of contact.html.

Developer notes:
- This bundle intentionally keeps all JS inline to avoid external dependencies. For production, move scripts into a module file and add proper form submission handlers secured by a practice backend.
- Keep crisis guidance prominent and unchanged to meet ethical expectations.

End of README.