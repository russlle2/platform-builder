import { posix } from 'node:path';
import { detectPageRole } from './contracts.js';

const NICHE_COPY: Readonly<Record<string, { label: string; intro: string; services: string }>> = {
  aromatherapy: {
    label: 'Aromatherapy',
    intro: 'Explore a practical, safety-conscious approach to personalized aromatherapy.',
    services: 'Ask about current consultation options, aromatic education, and custom blend guidance.',
  },
  holistic_medicine: {
    label: 'Holistic Wellness',
    intro: 'Learn about an individualized, whole-person approach to everyday wellness support.',
    services: 'Ask about current services, practitioner availability, and whether the practice may fit your goals.',
  },
  private_practice_therapist: {
    label: 'Private Practice',
    intro: 'Explore support options in a respectful, private, and welcoming setting.',
    services: 'Ask about current services, availability, payment options, and the next step for an introductory conversation.',
  },
  sound_bath: {
    label: 'Sound Bath',
    intro: 'Discover thoughtfully facilitated sound experiences in a calm, inclusive setting.',
    services: 'Ask about current sessions, group events, private experiences, accessibility, and what to expect.',
  },
  wellness_coach: {
    label: 'Wellness Coaching',
    intro: 'Explore practical coaching support centered on your priorities and day-to-day life.',
    services: 'Ask about current coaching formats, availability, and what an introductory conversation includes.',
  },
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageLabel(page: string): string {
  const stem = posix.basename(page).replace(/\.html?$/i, '');
  if (/^index$/i.test(stem)) return 'Home';
  return stem.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function roleContent(role: string, copy: { label: string; intro: string; services: string }): string {
  switch (role) {
    case 'home':
      return `<h1>{{BUSINESS_NAME}}</h1><p class="lede">{{TAGLINE}}</p><p>${escapeHtml(copy.intro)}</p><a class="button" href="{{BOOKING_URL}}">{{PRIMARY_CTA_LABEL}}</a>`;
    case 'about':
      return `<h1>About {{BUSINESS_NAME}}</h1><p>${escapeHtml(copy.intro)}</p><h2>A clear first step</h2><p>Contact {{PRACTITIONER_NAME}} to ask questions and learn what is currently available.</p>`;
    case 'services':
      return `<h1>Services</h1><p>${escapeHtml(copy.services)}</p><h2>Built around clear expectations</h2><p>Details can be updated as offerings evolve.</p>`;
    case 'pricing':
      return '<h1>Pricing</h1><p>Contact for current pricing.</p><p>Ask what is included before choosing a service.</p>';
    case 'faq':
      return '<h1>Frequently asked questions</h1><h2>How do I begin?</h2><p>Send a short message or request a conversation.</p><h2>What should I expect?</h2><p>Current details are shared before you decide whether to proceed.</p>';
    case 'booking':
    case 'contact':
      return `<h1>${role === 'booking' ? 'Request a conversation' : 'Contact'}</h1><p>Use this form for a general inquiry. Please do not include private health information.</p>${safeForm()}`;
    case 'events':
      return '<h1>Events</h1><p>Contact us for the current schedule and availability.</p>';
    case 'resources':
      return `<h1>${escapeHtml(copy.label)} resources</h1><p>Practical information and current service details can be added here.</p>`;
    case 'shop':
    case 'blends':
      return `<h1>${escapeHtml(pageLabel(`${role}.html`))}</h1><p>Contact us to ask about current options, suitability, and availability.</p>`;
    default:
      return `<h1>${escapeHtml(pageLabel(`${role}.html`))}</h1><p>${escapeHtml(copy.services)}</p>`;
  }
}

function safeForm(): string {
  return '<form method="post"><label>Name<input name="name" autocomplete="name" required></label><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Phone (optional)<input type="tel" name="phone" autocomplete="tel"></label><label>Message<textarea name="message" required></textarea></label><button type="submit">Send inquiry</button></form>';
}

export function createNeutralFallbackFiles(input: {
  slug: string;
  niche: string;
  pages: readonly string[];
  reason: string;
}): Map<string, string | Uint8Array> {
  const copy = NICHE_COPY[input.niche] ?? {
    label: 'Wellness',
    intro: 'Explore current services in a clear and welcoming setting.',
    services: 'Ask about current options, availability, and next steps.',
  };
  const safePages = [...new Set(['index.html', ...input.pages])]
    .map((page) => page.replace(/\\/g, '/'))
    .filter((page) => /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+\.html?$/i.test(page))
    .sort((a, b) => a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b));
  const nav = safePages.map((page) => `<li><a href="${escapeHtml(page)}">${escapeHtml(pageLabel(page))}</a></li>`).join('');
  const files = new Map<string, string | Uint8Array>();
  for (const page of safePages) {
    const stylesheet = posix.relative(posix.dirname(page), 'assets/css/styles.css') || 'assets/css/styles.css';
    const role = detectPageRole(page);
    files.set(page, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(pageLabel(page))} | {{BUSINESS_NAME}}</title><meta name="description" content="${escapeHtml(copy.intro)}"><link rel="stylesheet" href="${escapeHtml(stylesheet)}"></head><body><a class="skip-link" href="#main">Skip to content</a><header><nav aria-label="Primary"><a class="brand" href="index.html">{{BUSINESS_NAME}}</a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-list"><span class="sr-only">Toggle navigation</span>Menu</button><ul id="nav-list" class="nav-list">${nav}</ul></nav></header><main id="main">${roleContent(role, copy)}</main><footer><p><strong>{{BUSINESS_NAME}}</strong> — {{TAGLINE}}</p><address>{{ADDRESS}}</address><p><a href="mailto:{{EMAIL}}">{{EMAIL}}</a> · <a href="tel:{{PHONE}}">{{PHONE}}</a></p></footer></body></html>`);
  }
  files.set('assets/css/styles.css', `:root{--dc-theme-primary:#285847;--dc-theme-accent:#d8955b;--dc-theme-surface:#f7f4ed;--dc-theme-ink:#17231e;--dc-theme-font:system-ui,-apple-system,"Segoe UI",sans-serif}*{box-sizing:border-box}html{font-family:var(--dc-theme-font);color:var(--dc-theme-ink);background:var(--dc-theme-surface);line-height:1.6}body{margin:0}a{color:var(--dc-theme-primary)}.skip-link{position:absolute;left:-9999px}.skip-link:focus{left:1rem;top:1rem;background:white;padding:.5rem;z-index:2}header,main,footer{width:min(72rem,calc(100% - 2rem));margin-inline:auto}nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 0}.nav-list{display:flex;flex-wrap:wrap;gap:1rem;list-style:none;margin:0;padding:0}.nav-toggle{display:none}.brand{font-weight:800;text-decoration:none}main{min-height:60vh;padding:clamp(3rem,8vw,8rem) 0}h1{font-size:clamp(2.25rem,7vw,5rem);line-height:1.05;max-width:15ch}h2{margin-top:2.5rem}.lede{font-size:1.3rem;max-width:42rem}.button,button{display:inline-block;border:0;border-radius:999px;background:var(--dc-theme-primary);color:white;padding:.75rem 1.1rem;font:inherit;text-decoration:none}form{display:grid;gap:1rem;max-width:38rem}label{display:grid;gap:.35rem}input,textarea{width:100%;font:inherit;padding:.75rem;border:1px solid #65746d;border-radius:.4rem}textarea{min-height:8rem}footer{border-top:1px solid #cbd3ce;padding:2rem 0}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:44rem){.nav-toggle{display:block}.nav-list{display:none;width:100%}.nav-list.is-open{display:flex}nav{flex-wrap:wrap}}`);
  files.set('template.json', JSON.stringify({
    contractVersion: 3,
    slug: input.slug,
    legacySlug: input.slug,
    name: `${copy.label} — adaptable foundation`,
    niche: input.niche,
    pages: safePages,
  }));
  files.set('fields.json', JSON.stringify({ fields: [
    { name: 'ADDRESS', label: 'Address or service area', type: 'text' },
    { name: 'BOOKING_URL', label: 'Booking link', type: 'url' },
    { name: 'BUSINESS_NAME', label: 'Business name', type: 'text' },
    { name: 'EMAIL', label: 'Email', type: 'email' },
    { name: 'PHONE', label: 'Phone', type: 'tel' },
    { name: 'PRACTITIONER_NAME', label: 'Practitioner name', type: 'text' },
    { name: 'PRIMARY_CTA_LABEL', label: 'Primary call to action', type: 'text' },
    { name: 'TAGLINE', label: 'Tagline', type: 'text' },
  ] }));
  files.set('.dailyclarity/fallback-reason.json', `${JSON.stringify({
    version: 1,
    sourcePreserved: true,
    reason: input.reason,
  }, null, 2)}\n`);
  return files;
}
