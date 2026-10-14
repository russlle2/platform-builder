# DailyClarity live audit — 2026-10-14

Scope: read-only HTTP and Chromium inspection of https://dailyclarity.org, followed by comparison with the checked-out repository. The deployed site differs materially from repository HEAD. Local fixes below are not evidence that production has been updated.

## Confirmed live behavior

- Home, pricing, preview wizard, platform demo, portal, contact, and all five industry pages returned HTTP 200. `/dashboard` redirected to `/login?next=%2Fdashboard` and showed a magic-link form.
- Each industry template API returned HTTP 200 with a non-empty catalog: aromatherapy 1,291; holistic medicine 1,002; private practice therapist 1,087; sound bath 1,001; wellness coach 1,104. The live catalog advertises 5,485 templates in total. This is an inventory count, not certification of every template.
- A wellness-coach wizard journey reached business details, style preferences, template matching, and the editor. Template preview HTML, its CSS, and JavaScript returned HTTP 200. The editor generated a pricing link carrying the chosen niche and template.
- Six demo pages and their six MP4 assets returned HTTP 200. The video assets reported `video/mp4`, approximately 2.9–3.7 MB each.
- `/api/platform/config` returned `trialDays: 7`. Pricing described $20/month Basic, $80/month Security + Ads, and an immediate $500 custom build. The subscription trial explicitly required a card. The observed checkout implementation and copy used Stripe; no PayPal trial entry was visible.
- `robots.txt` and `sitemap.xml` returned HTTP 200. The sitemap's reported last-modified timestamp was July 13, 2026.

## Problems and deployment differences

| Finding | Live evidence | Repository state / action |
| --- | --- | --- |
| Explicit industry selection was ignored after an earlier saved draft | Visiting `?niche=wellness_coach`, then `?niche=aromatherapy`, still displayed Wellness Coach | Fixed the wizard to honor each explicit, valid URL selection while preserving business details and style preferences. A changed industry clears the previous template match. |
| Gallery template selection was ignored | Gallery cards linked to `?niche=…&template=…`; wizard source never consumed the `template` parameter | Fixed matching to choose the requested template only if present in the selected industry's catalog. Missing styles receive an explicit replacement explanation. |
| Saved-draft hydration exposed stale controls | Local browser regression showed a saved business with the server's generic niche placeholder; early Continue clicks could be lost | Form controls now wait for browser restoration before rendering. |
| Broken character encoding | Wizard showed `ΓåÆ`, `Γ£ô`, `≡ƒ…` instead of arrows, ticks, and icons; some gallery names ended with `Â` | Wizard source already contains correct Unicode. Production still needs a current deployment; legacy catalog metadata requires separate catalog validation. |
| Contradictory proof claims | Home said pilot examples and case studies were coming soon; pricing displayed named testimonials claiming bookings and conversion improvements | Current pricing source already removes these testimonials and explains the absence of verified proof. This fix was not present on the deployed page. |
| Hydration warning on one industry page | One `/sound_bath` visit emitted React error #418 | Observed once during the initial cross-route sweep; page content remained visible. No claim of a universal production fix. |

## Validation and limits

The browser journey intercepted lead intake and draft-save POSTs with local responses; it did not submit synthetic contacts, send email, begin a real checkout, or make a purchase. Those intercepted 200 responses do **not** establish that intake or draft persistence works in production. Only template preview rendering POSTs were sent live.

Local regression coverage is in `apps/generator-app/e2e/preview-selection.spec.ts`: changing a saved industry (including navigation within the same page), preserving a draft without a new industry parameter, honoring a published gallery selection, and explaining an unavailable gallery style. Existing preview editor wiring and booking-kit transfer unit tests were also run.

This public audit cannot verify payment provider credentials, signed payment webhooks, authenticated customer editing, welcome-email delivery, DNS provisioning, or actual customer-site deployment. Those require the configured integration environment and a sandbox transaction. Repository readiness must be distinguished from production readiness.
