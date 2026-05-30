# West Shore Shade — Website & Lead Capture Fixes

**Purpose:** Everything related to the website, contact forms, lead follow-up, and customer communication — including what to request from **SodaRocket** (the web agency).

**For:** Office Manager — use this when talking to SodaRocket or improving how leads are handled in the office.

**Website:** https://www.westshoreshade.com/

---

## How Leads Come In Today

| Source | What Happens |
|--------|--------------|
| **Phone** | Customer calls 813-252-6813 |
| **Website forms** | Name, phone, email, zip, product interest → submitted via Webflow forms |
| **Email** | contactus@westshoreshade.com |
| **Showroom walk-in** | 9885 S US Hwy 41, Gibsonton |
| **Google Maps** | Call or website click from listing |

**Missing today:** Live chat, online scheduling, call tracking, form source tracking, after-hours auto-text.

---

## Section 1: Website Issues to Fix (For SodaRocket)

Copy this section into an email to SodaRocket if helpful.

### 🔴 Priority 1 — Broken Financing

| Item | Detail |
|------|--------|
| **Issue** | FINANCING menu link goes to inactive Enhancify portal |
| **Fix option A** | Update link when new financing partner is live |
| **Fix option B** | Temporarily link to contact page with anchor text “Ask About Financing” |
| **Fix option C** | Remove FINANCING from nav until portal works |

---

### 🔴 Priority 2 — Address in Code (Schema)

| Item | Detail |
|------|--------|
| **Issue** | Hidden Google/schema data says **9871** US Hwy 41; website shows **9885** |
| **Fix** | Update schema markup to match confirmed correct address everywhere |

---

### 🟠 Priority 3 — Rebuild `/review` Page

| Item | Detail |
|------|--------|
| **Issue** | Page exists but is empty — useless for review campaigns |
| **Fix** | Simple page with: headline, thank-you message, big Google review button, optional QR code |
| **Office provides** | Google review link from Business Profile |

**Suggested page content:**

> ## Thank You for Choosing West Shore Shade!
> We hope you love your new screens/awnings. Your feedback helps our local business grow.
> **[Leave a Google Review →]** (button)
> Questions? Call 813-252-6813

---

### 🟠 Priority 4 — Form Improvements

**Current form fields:**
- Name
- Phone
- Email
- Zip code
- Product you are interested (free text)

**Recommended additions:**

| Field | Type | Why |
|-------|------|-----|
| Product interest | **Dropdown** | Easier to route: Screens / Awnings / Garage screen / Interior / Commercial / Not sure |
| Timeline | Dropdown | ASAP / 1–3 months / Just researching |
| Preferred contact | Dropdown | Call / Text / Email |
| How did you hear about us? | Dropdown | Google / Facebook / Referral / Drive-by showroom / Other |
| Photo upload | Optional | Customer sends photo of patio/lanai — helps sales prep |
| SMS consent | Checkbox | “I agree to receive text messages about my estimate” (TCPA compliance) |

**Form friction issue:**
- Forms use **Cloudflare Turnstile** (spam protection). Submit button stays disabled until captcha completes. This is OK for spam but loses some mobile users.
- **Ask SodaRocket:** Confirm forms work reliably on iPhone and Android. Test monthly.

**Auto-reply email (request from SodaRocket):**
> Subject: We received your request — West Shore Shade
>
> Hi [Name],
>
> Thank you for contacting West Shore Shade! We received your request and will call you within [X] business hours.
>
> Need help sooner? Call 813-252-6813.
>
> — West Shore Shade Outdoors & More

- [ ] Send form improvement list to SodaRocket
- [ ] Confirm which email inbox receives form submissions
- [ ] Set up auto-reply

---

### 🟡 Priority 5 — Add Live Google Reviews to Homepage

| Item | Detail |
|------|--------|
| **Issue** | Testimonials on site (Nicole M., Emily R., etc.) aren’t linked to real Google reviews |
| **Fix** | Embed Google reviews widget OR manually feature recent reviews with “Verified Google Review” label |
| **Office provides** | Permission if using full names; link to review profile |

---

### 🟡 Priority 6 — SEO / Content Fixes

| Issue | Fix |
|-------|-----|
| “Lanai’s” on homepage | Change to **“Lanais”** |
| “Sarosota” in blog | Change to **Sarasota** |
| Email in schema: info@ vs contactus@ | Standardize to **contactus@westshoreshade.com** |
| Service Areas page doesn’t link to city pages | Add links: Tampa → /motorized-shades/tampa-fl, etc. |
| Duplicate city URLs (e.g. brandon-fl and brandon-fl-65r6k) | Redirect duplicates to one URL |

---

### 🟡 Priority 7 — Tracking (Ask SodaRocket or Ads Person)

**Already installed:**
- Google Analytics 4 (GA4)
- Google Ads conversion tracking
- Microsoft Clarity (records how visitors use site — useful for debugging forms)

**Recommended additions:**

| Tool | Purpose | Priority |
|------|---------|----------|
| **Call tracking** (CallRail, WhatConverts) | Know which ads/keywords drive phone calls | High |
| **Facebook/Meta Pixel** | Retarget website visitors on Facebook/Instagram | Medium |
| **Form source tracking** | “How did you hear about us?” field | High (can be free) |

---

## Section 2: Office Lead Handling (Your Job)

Even a perfect website fails if leads sit too long. **Speed wins.**

### The 5-Minute Rule

Industry data: calling a web lead within **5 minutes** dramatically increases close rate vs. waiting hours.

**Office workflow:**

```
Form/call comes in
    ↓
Within 5 min: Call customer (or text if no answer)
    ↓
If no answer: Leave voicemail + send text
    ↓
Same day: Schedule free estimate (in-home or showroom)
    ↓
After install: Send review request (see Doc 03)
```

### Lead intake checklist (use for every new lead)

```
NEW LEAD LOG

Date/time received: _______________
Source: [ ] Phone  [ ] Website form  [ ] Email  [ ] Walk-in  [ ] Google  [ ] Referral  [ ] Other: _______

Customer name: _______________
Phone: _______________
Email: _______________
City/Zip: _______________
Product interest: _______________
Timeline: _______________

First contact made: _______________ (time)
Spoke with customer? [ ] Yes  [ ] No — left VM/text
Estimate scheduled: _______________ (date/time)
Assigned to: _______________
Notes: ___________________________________
```

- [ ] Print several copies or create a simple Google Sheet with these columns
- [ ] Review lead log every morning and afternoon — nothing older than 24 hours without contact

---

## Section 3: Phone & After-Hours

### Business hours (per website)
- Mon–Fri: 8am–6pm
- Sat: Appointment only
- Sun: Closed

### After-hours voicemail script (suggested)

> “Thank you for calling West Shore Shade, Tampa Bay’s motorized screen and awning specialists. Our office is currently closed. Please leave your name, number, and a brief message, and we’ll call you back on the next business day. For faster service, visit westshoreshade.com and fill out our free estimate form. You can also visit our Gibsonton showroom Monday through Friday, 8 to 6.”

### After-hours text auto-reply (if using business texting)

> Thanks for contacting West Shore Shade! We’re closed now but received your message. We’ll call you [tomorrow / Monday]. Need to schedule? Visit westshoreshade.com/contact-us or call 813-252-6813 during business hours.

- [ ] Update voicemail if needed
- [ ] Consider business texting (Google Voice, OpenPhone, etc.)

---

## Section 4: Showroom Walk-In Process

The website says **walk-ins welcome** — make sure the office is ready.

**Showroom checklist:**
- [ ] Greeting script for walk-ins
- [ ] Fabric sample book ready
- [ ] Business cards / brochures available
- [ ] iPad or QR code for contact form if after-hours
- [ ] Log walk-ins in lead sheet with source = “Showroom walk-in”

**Walk-in script:**
> “Welcome to West Shore Shade! Are you looking for screens, awnings, or just browsing? We offer free estimates — I can schedule someone to come measure, or Matt/[salesperson] can talk you through options now if available.”

---

## Section 5: Email Templates for Office Use

### New lead — scheduling estimate

> Subject: Your free estimate — West Shore Shade
>
> Hi [Name],
>
> Thanks for reaching out! I'd love to schedule your free [in-home / showroom] consultation.
>
> Available times this week:
> - [Option 1]
> - [Option 2]
> - [Option 3]
>
> Reply with what works, or call me at 813-252-6813.
>
> — [Your name], West Shore Shade Outdoors & More

### Follow-up — no response after 48 hours

> Subject: Still interested in motorized screens/awnings?
>
> Hi [Name],
>
> I wanted to follow up on your request for a free estimate. Are you still looking for [screens/awnings] for your [lanai/patio]?
>
> Happy to answer questions or schedule a quick visit. Call/text 813-252-6813 anytime.
>
> — [Your name]

### Post-install — review request

(See full templates in **03-GOOGLE-BUSINESS-PROFILE-GUIDE.md**)

---

## Section 6: What to Email SodaRocket (Copy/Paste)

**Subject:** West Shore Shade — website fixes for lead generation

> Hi SodaRocket team,
>
> We're working on improving lead capture for West Shore Shade and need help with the following:
>
> **Urgent**
> 1. Financing link — Enhancify portal is inactive. Please remove or redirect FINANCING nav link until we have a working URL.
> 2. Address in schema markup — Update to match confirmed address: [9885 or 9871 — insert correct number] US Hwy 41 S, Gibsonton, FL 33534.
> 3. Rebuild /review page with our Google review link: [INSERT LINK].
>
> **High priority**
> 4. Form improvements — Add dropdowns for product type, timeline, preferred contact, and "how did you hear about us?"
> 5. Form auto-reply email when someone submits contact form.
> 6. Embed Google reviews on homepage (we'll provide link/widget preference).
>
> **Medium priority**
> 7. Fix typos: "Lanai's" → "Lanais"; "Sarosota" → "Sarasota" in blog.
> 8. Link Service Areas page to city landing pages (e.g., Tampa → /motorized-shades/tampa-fl).
> 9. Redirect duplicate city URLs to canonical versions.
> 10. Standardize email to contactus@westshoreshade.com in all markup.
>
> Please send timeline and cost estimate for the above. Happy to jump on a call.
>
> Thank you,
> [Name]
> West Shore Shade Outdoors & More

---

## Website & Lead Capture Checklist

```
FOR SODAROCKET (WEB)
[ ] Fix financing link
[ ] Fix schema address
[ ] Rebuild /review page
[ ] Improve contact forms
[ ] Form auto-reply email
[ ] Google reviews on homepage
[ ] Fix typos and duplicate URLs
[ ] Add call tracking (optional — may need 3rd party)

FOR OFFICE (YOU)
[ ] Lead log / spreadsheet set up
[ ] 5-minute response rule communicated to team
[ ] Voicemail script updated
[ ] Showroom walk-in process ready
[ ] Email templates saved
[ ] Google review link saved for texts/emails
[ ] Test contact form monthly — submit test lead
```

---

**Next document:** Open **05-ADVERTISING-AND-SOCIAL-MEDIA-PLAYBOOK.md** for Google Ads, Facebook/Instagram, and promotions.
