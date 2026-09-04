/**
 * Programmatic foundation skeleton builders — used when Gemini API is unavailable
 * or as validated structural fallback. Each builder produces distinct layout families.
 */
import type { Niche, LayoutFamily } from './generate-foundations-types.js';
import { LAYOUT_FAMILIES } from './generate-foundations-types.js';

export { LAYOUT_FAMILIES };
export type { LayoutFamily };

const PAGE_SETS: Record<Niche, string[]> = {
  aromatherapy: [
    'index.html',
    'services.html',
    'blends.html',
    'about.html',
    'contact.html',
    'book.html',
  ],
  holistic_medicine: [
    'index.html',
    'services.html',
    'approach.html',
    'about.html',
    'contact.html',
    'book.html',
  ],
  private_practice_therapist: [
    'index.html',
    'specialties.html',
    'approach.html',
    'about.html',
    'contact.html',
    'book.html',
  ],
  sound_bath: [
    'index.html',
    'sessions.html',
    'experience.html',
    'about.html',
    'contact.html',
    'book.html',
  ],
  wellness_coach: [
    'index.html',
    'programs.html',
    'results.html',
    'about.html',
    'contact.html',
    'book.html',
  ],
};

const NICHE_LABELS: Record<Niche, string> = {
  aromatherapy: 'Aromatherapy',
  holistic_medicine: 'Holistic Medicine',
  private_practice_therapist: 'Private Practice Therapy',
  sound_bath: 'Sound Bath',
  wellness_coach: 'Wellness Coaching',
};

const NICHE_SECTIONS: Record<Niche, Array<{ id: string; heading: string; body: string; extra?: string }>> = {
  aromatherapy: [
    { id: 'ritual', heading: '{{SECTION_1_HEADING}}', body: '{{SECTION_1_BODY}}', extra: 'Scent ritual and botanical care' },
    { id: 'blends', heading: '{{SECTION_2_HEADING}}', body: '{{SECTION_2_BODY}}', extra: 'Custom aromatic blends' },
    { id: 'boutique', heading: '{{SECTION_3_HEADING}}', body: '{{SECTION_3_BODY}}', extra: 'Curated wellness boutique' },
  ],
  holistic_medicine: [
    { id: 'approach', heading: '{{SECTION_1_HEADING}}', body: '{{SECTION_1_BODY}}', extra: 'Integrative care philosophy' },
    { id: 'modalities', heading: '{{SECTION_2_HEADING}}', body: '{{SECTION_2_BODY}}', extra: 'Evidence-informed modalities' },
    { id: 'credentials', heading: '{{SECTION_3_HEADING}}', body: '{{SECTION_3_BODY}}', extra: 'Credentials and trust' },
  ],
  private_practice_therapist: [
    { id: 'specialties', heading: '{{SECTION_1_HEADING}}', body: '{{SECTION_1_BODY}}', extra: 'Therapeutic specialties' },
    { id: 'approach', heading: '{{SECTION_2_HEADING}}', body: '{{SECTION_2_BODY}}', extra: 'A gentle, collaborative approach' },
    { id: 'intake', heading: '{{SECTION_3_HEADING}}', body: '{{SECTION_3_BODY}}', extra: 'What to expect at intake' },
  ],
  sound_bath: [
    { id: 'sessions', heading: '{{SECTION_1_HEADING}}', body: '{{SECTION_1_BODY}}', extra: 'Immersive sound sessions' },
    { id: 'instruments', heading: '{{SECTION_2_HEADING}}', body: '{{SECTION_2_BODY}}', extra: 'Instruments and soundscape' },
    { id: 'experience', heading: '{{SECTION_3_HEADING}}', body: '{{SECTION_3_BODY}}', extra: 'The listener journey' },
  ],
  wellness_coach: [
    { id: 'programs', heading: '{{SECTION_1_HEADING}}', body: '{{SECTION_1_BODY}}', extra: 'Transformation programs' },
    { id: 'method', heading: '{{SECTION_2_HEADING}}', body: '{{SECTION_2_BODY}}', extra: 'Coaching methodology' },
    { id: 'results', heading: '{{SECTION_3_HEADING}}', body: '{{SECTION_3_BODY}}', extra: 'Client wins and momentum' },
  ],
};

const PALETTES: Record<Niche, Record<string, string>> = {
  aromatherapy: {
    '--bg': '#faf6f0',
    '--fg': '#2c2419',
    '--primary': '#5a7a4e',
    '--accent': '#c4a882',
    '--card': '#fffdf9',
    '--muted': '#7a6f63',
  },
  holistic_medicine: {
    '--bg': '#f4f7f6',
    '--fg': '#1a2e2a',
    '--primary': '#2d6a5a',
    '--accent': '#7eb8a8',
    '--card': '#ffffff',
    '--muted': '#5c6f6a',
  },
  private_practice_therapist: {
    '--bg': '#f9f7f5',
    '--fg': '#3d3530',
    '--primary': '#8b7355',
    '--accent': '#c9b8a8',
    '--card': '#fffcfa',
    '--muted': '#8a7f76',
  },
  sound_bath: {
    '--bg': '#0f1419',
    '--fg': '#e8eef2',
    '--primary': '#6b9dad',
    '--accent': '#c9a86c',
    '--card': '#1a2229',
    '--muted': '#8a9aa6',
  },
  wellness_coach: {
    '--bg': '#f0f4f8',
    '--fg': '#1a2332',
    '--primary': '#2563eb',
    '--accent': '#f59e0b',
    '--card': '#ffffff',
    '--muted': '#64748b',
  },
};

const NAV_LABELS: Record<string, string> = {
  'index.html': 'Home',
  'services.html': 'Services',
  'blends.html': 'Blends',
  'approach.html': 'Approach',
  'specialties.html': 'Specialties',
  'sessions.html': 'Sessions',
  'experience.html': 'Experience',
  'programs.html': 'Programs',
  'results.html': 'Results',
  'about.html': 'About',
  'contact.html': 'Contact',
  'book.html': 'Book',
};

function pagesComment(pages: string[]): string {
  return `<!-- PAGES: ${pages.join(', ')} -->`;
}

function buildNav(pages: string[], layout: LayoutFamily): string {
  const links = pages
    .map((p) => {
      const href = p === 'index.html' ? 'index.html' : p;
      const label = NAV_LABELS[p] ?? p.replace('.html', '');
      const cls = p === 'book.html' ? ' class="nav-cta"' : '';
      return `        <li><a href="${href}"${cls}>${label}</a></li>`;
    })
    .join('\n');

  return `    <!-- NAV_START -->
    <nav class="main-nav layout-${layout}" aria-label="Primary navigation">
      <a class="brand" href="index.html">
        <span class="brand-name">{{BUSINESS_NAME}}</span>
        <span class="brand-tag">{{TAGLINE}}</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu">Menu</button>
      <ul id="nav-menu" class="nav-list">
${links}
      </ul>
    </nav>
    <!-- NAV_END -->`;
}

function buildFaq(): string {
  return `    <section class="faq" id="faq" aria-labelledby="faq-heading">
      <div class="container">
        <h2 id="faq-heading">Frequently Asked Questions</h2>
        <dl class="faq-list">
          <div class="faq-item">
            <dt>{{FAQ_Q1}}</dt>
            <dd>{{FAQ_A1}}</dd>
          </div>
          <div class="faq-item">
            <dt>{{FAQ_Q2}}</dt>
            <dd>{{FAQ_A2}}</dd>
          </div>
          <div class="faq-item">
            <dt>{{FAQ_Q3}}</dt>
            <dd>{{FAQ_A3}}</dd>
          </div>
          <div class="faq-item">
            <dt>{{FAQ_Q4}}</dt>
            <dd>{{FAQ_A4}}</dd>
          </div>
        </dl>
      </div>
    </section>`;
}

function buildFooter(): string {
  return `    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <strong>{{BUSINESS_NAME}}</strong>
          <p>{{TAGLINE}}</p>
          <p class="location">{{CITY}}, {{STATE}}</p>
        </div>
        <div class="footer-contact">
          <p>Led by {{PRACTITIONER_NAME}}</p>
          <p><a href="mailto:{{EMAIL}}">{{EMAIL}}</a></p>
          <p><a href="tel:{{PHONE}}">{{PHONE}}</a></p>
        </div>
        <div class="footer-cta">
          <a class="btn btn-primary" href="book.html">{{CTA_LABEL}}</a>
        </div>
      </div>
      <p class="footer-copy">&copy; {{BUSINESS_NAME}} — {{CITY}}, {{STATE}}</p>
    </footer>`;
}

function buildHero(layout: LayoutFamily): string {
  const heroes: Record<LayoutFamily, string> = {
    'hero-left': `    <section class="hero hero-left" aria-labelledby="hero-heading">
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">{{TAGLINE}}</p>
          <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
          <p class="hero-sub">{{HERO_SUBHEADLINE}}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="book.html">{{CTA_LABEL}}</a>
            <a class="btn btn-ghost" href="about.html">Meet {{PRACTITIONER_NAME}}</a>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="hero-panel"></div>
        </div>
      </div>
    </section>`,
    'hero-centered': `    <section class="hero hero-centered" aria-labelledby="hero-heading">
      <div class="hero-inner">
        <p class="eyebrow">{{TAGLINE}}</p>
        <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
        <p class="hero-sub">{{HERO_SUBHEADLINE}}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="book.html">{{CTA_LABEL}}</a>
        </div>
      </div>
    </section>`,
    editorial: `    <section class="hero hero-editorial" aria-labelledby="hero-heading">
      <div class="hero-inner">
        <p class="kicker">{{TAGLINE}}</p>
        <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
        <p class="lead">{{HERO_SUBHEADLINE}}</p>
        <blockquote class="pull-quote">A considered approach from {{PRACTITIONER_NAME}} in {{CITY}}, {{STATE}}.</blockquote>
      </div>
    </section>`,
    'split-screen': `    <section class="hero hero-split" aria-labelledby="hero-heading">
      <div class="split-left">
        <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
        <p>{{HERO_SUBHEADLINE}}</p>
      </div>
      <div class="split-right">
        <p class="eyebrow">{{TAGLINE}}</p>
        <a class="btn btn-primary" href="book.html">{{CTA_LABEL}}</a>
      </div>
    </section>`,
    magazine: `    <section class="hero hero-magazine" aria-labelledby="hero-heading">
      <div class="magazine-grid">
        <div class="magazine-main">
          <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
          <p>{{HERO_SUBHEADLINE}}</p>
        </div>
        <aside class="magazine-aside">
          <p>{{TAGLINE}}</p>
          <a href="book.html">{{CTA_LABEL}}</a>
        </aside>
      </div>
    </section>`,
    minimal: `    <section class="hero hero-minimal" aria-labelledby="hero-heading">
      <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
      <p class="hero-sub">{{HERO_SUBHEADLINE}}</p>
      <a class="text-cta" href="book.html">{{CTA_LABEL}} &rarr;</a>
    </section>`,
    'bold-statement': `    <section class="hero hero-bold" aria-labelledby="hero-heading">
      <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
      <p class="hero-sub">{{HERO_SUBHEADLINE}}</p>
      <a class="btn btn-primary btn-large" href="book.html">{{CTA_LABEL}}</a>
    </section>`,
    'luxury-gallery': `    <section class="hero hero-luxury" aria-labelledby="hero-heading">
      <div class="luxury-frame">
        <p class="eyebrow">{{TAGLINE}}</p>
        <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
        <p>{{HERO_SUBHEADLINE}}</p>
        <div class="gallery-row">
          <div class="gallery-cell"></div>
          <div class="gallery-cell"></div>
          <div class="gallery-cell"></div>
        </div>
      </div>
    </section>`,
    'nature-immersive': `    <section class="hero hero-nature" aria-labelledby="hero-heading">
      <div class="nature-blob" aria-hidden="true"></div>
      <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
      <p>{{HERO_SUBHEADLINE}}</p>
      <p class="nature-tag">{{TAGLINE}} — {{CITY}}, {{STATE}}</p>
    </section>`,
    'clinical-modern': `    <section class="hero hero-clinical" aria-labelledby="hero-heading">
      <div class="clinical-grid">
        <div>
          <p class="eyebrow">{{TAGLINE}}</p>
          <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
          <p>{{HERO_SUBHEADLINE}}</p>
        </div>
        <ul class="trust-badges">
          <li>Credential-forward care</li>
          <li>{{CITY}}, {{STATE}}</li>
          <li>Led by {{PRACTITIONER_NAME}}</li>
        </ul>
      </div>
    </section>`,
    'community-warm': `    <section class="hero hero-community" aria-labelledby="hero-heading">
      <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
      <p>{{HERO_SUBHEADLINE}}</p>
      <div class="welcome-card">
        <p>{{TAGLINE}}</p>
        <a class="btn btn-primary" href="book.html">{{CTA_LABEL}}</a>
      </div>
    </section>`,
    'conversion-focused': `    <section class="hero hero-conversion" aria-labelledby="hero-heading">
      <h1 id="hero-heading">{{HERO_HEADLINE}}</h1>
      <p>{{HERO_SUBHEADLINE}}</p>
      <ul class="benefit-list">
        <li>Personalized guidance from {{PRACTITIONER_NAME}}</li>
        <li>Serving {{CITY}}, {{STATE}}</li>
        <li>Clear next steps from day one</li>
      </ul>
      <a class="btn btn-primary btn-sticky-cta" href="book.html">{{CTA_LABEL}}</a>
    </section>`,
  };
  return heroes[layout];
}

function buildSections(niche: Niche, layout: LayoutFamily, num: number): string {
  const sections = NICHE_SECTIONS[niche];
  const order = num % 2 === 0 ? sections : [...sections].reverse();
  return order
    .map(
      (s, i) => `    <section class="content-section section-${s.id} layout-${layout} section-${i + 1}" id="${s.id}">
      <div class="container ${i % 2 === 0 ? 'section-grid' : 'section-stack'}">
        <div class="section-copy">
          <p class="section-label">${s.extra}</p>
          <h2>${s.heading}</h2>
          <p>${s.body}</p>
        </div>
        <div class="section-aside" aria-hidden="true">
          <div class="section-card">
            <span class="card-accent"></span>
            <p>{{PRACTITIONER_NAME}}</p>
            <p>{{CITY}}, {{STATE}}</p>
          </div>
        </div>
      </div>
    </section>`,
    )
    .join('\n\n');
}

function buildTestimonial(layout: LayoutFamily): string {
  return `    <section class="testimonials layout-${layout}">
      <div class="container">
        <h2>What clients share</h2>
        <figure class="testimonial-card">
          <blockquote>{{SECTION_3_BODY}}</blockquote>
          <figcaption>— A grateful client in {{CITY}}</figcaption>
        </figure>
      </div>
    </section>`;
}

function buildFeatureGrid(niche: Niche, layout: LayoutFamily): string {
  const features = NICHE_SECTIONS[niche].map(
    (s) => `          <article class="feature-card">
            <h3>${s.extra}</h3>
            <p>${s.body}</p>
            <a href="book.html">{{CTA_LABEL}}</a>
          </article>`,
  );
  return `    <section class="feature-grid layout-${layout}" aria-label="Highlights">
      <div class="container">
        <header class="section-header">
          <p class="eyebrow">{{TAGLINE}}</p>
          <h2>How {{BUSINESS_NAME}} supports you</h2>
        </header>
        <div class="feature-grid-inner">
${features.join('\n')}
        </div>
      </div>
    </section>`;
}

function buildCtaBand(layout: LayoutFamily): string {
  return `    <section class="cta-band layout-${layout}">
      <div class="container cta-band-inner">
        <div>
          <h2>Ready to begin?</h2>
          <p>Connect with {{PRACTITIONER_NAME}} in {{CITY}}, {{STATE}}.</p>
        </div>
        <div class="cta-band-actions">
          <a class="btn btn-primary" href="book.html">{{CTA_LABEL}}</a>
          <a class="btn btn-ghost" href="contact.html">Contact {{BUSINESS_NAME}}</a>
        </div>
      </div>
    </section>`;
}

function buildStyles(niche: Niche, layout: LayoutFamily): string {
  const palette = PALETTES[niche];
  const vars = Object.entries(palette)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  const layoutCss: Record<LayoutFamily, string> = {
    'hero-left': `
.hero-left .hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 3rem; align-items: center; }
.hero-left .hero-panel { min-height: 360px; border-radius: 24px; background: linear-gradient(135deg, var(--accent), var(--primary)); opacity: 0.35; }`,
    'hero-centered': `
.hero-centered { text-align: center; padding: 6rem 1.5rem; }
.hero-centered .hero-inner { max-width: 760px; margin: 0 auto; }`,
    editorial: `
.hero-editorial .hero-inner { max-width: 680px; margin: 0 auto; }
.hero-editorial .pull-quote { font-size: 1.25rem; border-left: 4px solid var(--accent); padding-left: 1.25rem; color: var(--muted); }`,
    'split-screen': `
.hero-split { display: grid; grid-template-columns: 1fr 1fr; min-height: 70vh; }
.hero-split .split-left, .hero-split .split-right { display: flex; flex-direction: column; justify-content: center; padding: 4rem; }
.hero-split .split-right { background: var(--card); border-left: 1px solid color-mix(in srgb, var(--muted) 25%, transparent); }`,
    magazine: `
.hero-magazine .magazine-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
.hero-magazine .magazine-aside { background: var(--card); padding: 2rem; border-radius: 16px; box-shadow: 0 12px 40px color-mix(in srgb, var(--fg) 8%, transparent); }`,
    minimal: `
.hero-minimal { padding: 8rem 2rem 4rem; max-width: 640px; }
.hero-minimal .text-cta { display: inline-block; margin-top: 2rem; font-weight: 600; color: var(--primary); text-decoration: none; }`,
    'bold-statement': `
.hero-bold h1 { font-size: clamp(2.8rem, 8vw, 5.5rem); line-height: 0.95; letter-spacing: -0.04em; max-width: 12ch; }
.hero-bold { padding: 5rem 2rem; }`,
    'luxury-gallery': `
.hero-luxury .luxury-frame { border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); padding: 3rem; border-radius: 8px; }
.hero-luxury .gallery-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 2rem; }
.hero-luxury .gallery-cell { aspect-ratio: 4/5; background: color-mix(in srgb, var(--accent) 20%, var(--card)); }`,
    'nature-immersive': `
.hero-nature { position: relative; overflow: hidden; padding: 6rem 2rem; }
.hero-nature .nature-blob { position: absolute; inset: -20% auto auto -10%; width: 420px; height: 420px; border-radius: 45% 55% 60% 40%; background: color-mix(in srgb, var(--primary) 25%, transparent); filter: blur(2px); }`,
    'clinical-modern': `
.hero-clinical .clinical-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 2rem; align-items: start; }
.hero-clinical .trust-badges { list-style: none; padding: 1.5rem; margin: 0; background: var(--card); border-radius: 12px; border: 1px solid color-mix(in srgb, var(--muted) 20%, transparent); }`,
    'community-warm': `
.hero-community .welcome-card { margin-top: 2rem; padding: 2rem; background: var(--card); border-radius: 20px; max-width: 480px; box-shadow: 0 8px 30px color-mix(in srgb, var(--fg) 6%, transparent); }`,
    'conversion-focused': `
.hero-conversion .benefit-list { margin: 1.5rem 0 2rem; padding-left: 1.25rem; }
.hero-conversion .btn-sticky-cta { box-shadow: 0 8px 24px color-mix(in srgb, var(--primary) 35%, transparent); }`,
  };

  return `  <style>
    /* Typography: humanist sans with clear hierarchy; headings slightly condensed for ${NICHE_LABELS[niche]} */
    /* Spacing: ${layout} rhythm — generous section padding, consistent 1.5rem base grid */
    :root {
${vars}
      --radius: ${layout === 'minimal' ? '8px' : layout === 'luxury-gallery' ? '4px' : '16px'};
      --space: 1.5rem;
      --font: "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: var(--font);
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
    }
    img { max-width: 100%; display: block; }
    a { color: var(--primary); }
    .container { width: min(1120px, 92vw); margin: 0 auto; }
    .site-header { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid color-mix(in srgb, var(--muted) 18%, transparent); }
    .main-nav { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.5rem; flex-wrap: wrap; }
    .brand { text-decoration: none; color: inherit; display: flex; flex-direction: column; }
    .brand-name { font-weight: 700; font-size: 1.1rem; }
    .brand-tag { font-size: 0.85rem; color: var(--muted); }
    .nav-list { list-style: none; display: flex; gap: 1rem; flex-wrap: wrap; margin: 0; padding: 0; align-items: center; }
    .nav-list a { text-decoration: none; color: var(--fg); font-size: 0.95rem; }
    .nav-list a.nav-cta, .nav-cta { background: var(--primary); color: #fff; padding: 0.5rem 1rem; border-radius: 999px; }
    .nav-toggle { display: none; border: 1px solid var(--muted); background: var(--card); padding: 0.4rem 0.75rem; border-radius: 8px; }
    .hero { padding: 4rem 1.5rem; }
    .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1; margin: 0.5rem 0 1rem; }
    .hero-sub, .lead { font-size: 1.15rem; color: var(--muted); max-width: 52ch; }
    .eyebrow, .kicker, .section-label { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem; color: var(--accent); font-weight: 600; }
    .btn { display: inline-block; text-decoration: none; border-radius: var(--radius); padding: 0.85rem 1.35rem; font-weight: 600; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-ghost { border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent); color: var(--primary); margin-left: 0.75rem; }
    .btn-large { padding: 1rem 1.75rem; font-size: 1.05rem; }
    .hero-actions { margin-top: 1.75rem; }
    .content-section { padding: 4.5rem 0; }
    .content-section:nth-child(even) { background: color-mix(in srgb, var(--card) 70%, var(--bg)); }
    .section-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 2.5rem; align-items: center; }
    .section-stack { display: flex; flex-direction: column; gap: 1.5rem; }
    .section-card { background: var(--card); border-radius: var(--radius); padding: 2rem; border: 1px solid color-mix(in srgb, var(--muted) 15%, transparent); position: relative; }
    .card-accent { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--primary), var(--accent)); border-radius: var(--radius) var(--radius) 0 0; }
    .cta-band { padding: 4rem 0; background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, var(--bg)), var(--bg)); }
    .cta-band-inner { display: flex; justify-content: space-between; align-items: center; gap: 2rem; flex-wrap: wrap; }
    .cta-band-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .feature-grid { padding: 4rem 0; }
    .feature-grid-inner { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
    .feature-card { background: var(--card); border-radius: var(--radius); padding: 1.75rem; border: 1px solid color-mix(in srgb, var(--muted) 14%, transparent); display: flex; flex-direction: column; gap: 0.75rem; min-height: 200px; }
    .feature-card h3 { margin: 0; font-size: 1.05rem; }
    .feature-card p { margin: 0; color: var(--muted); flex: 1; }
    .feature-card a { font-weight: 600; text-decoration: none; }
    .section-header { margin-bottom: 2rem; max-width: 640px; }
    .section-header h2 { margin: 0.35rem 0 0; font-size: clamp(1.6rem, 3vw, 2.2rem); }
    .testimonials { padding: 4rem 0; }
    .testimonial-card { background: var(--card); padding: 2rem; border-radius: var(--radius); border-left: 4px solid var(--accent); margin: 0; }
    .faq { padding: 4.5rem 0; background: var(--card); }
    .faq-list { display: grid; gap: 1.25rem; }
    .faq-item { padding: 1.25rem 0; border-bottom: 1px solid color-mix(in srgb, var(--muted) 20%, transparent); }
    .faq-item dt { font-weight: 700; margin-bottom: 0.5rem; }
    .faq-item dd { margin: 0; color: var(--muted); }
    .site-footer { padding: 3rem 1.5rem 2rem; background: color-mix(in srgb, var(--fg) 92%, #000); color: #f5f5f5; }
    .footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; }
    .site-footer a { color: #fff; }
    .footer-copy { text-align: center; margin: 2rem 0 0; font-size: 0.85rem; opacity: 0.75; }
    ${layoutCss[layout]}
    @media (max-width: 800px) {
      .nav-toggle { display: inline-block; }
      .nav-list { display: none; width: 100%; flex-direction: column; align-items: flex-start; }
      .nav-list.is-open { display: flex; }
      .hero-left .hero-grid, .hero-split, .hero-magazine .magazine-grid, .hero-clinical .clinical-grid, .section-grid { grid-template-columns: 1fr; }
      .hero-split .split-right { border-left: none; border-top: 1px solid color-mix(in srgb, var(--muted) 25%, transparent); }
    }
  </style>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const toggle = document.querySelector('.nav-toggle');
      const menu = document.querySelector('.nav-list');
      if (toggle && menu) {
        toggle.addEventListener('click', () => {
          const open = menu.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(open));
        });
      }
    });
  </script>`;
}

export function buildFoundationLocal(niche: Niche, foundationNum: number): string {
  const layout = LAYOUT_FAMILIES[foundationNum - 1];
  const pages = PAGE_SETS[niche];
  const label = NICHE_LABELS[niche];

  return `<!-- FOUNDATION: ${niche} layout-family-${layout} -->
${pagesComment(pages)}
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{BUSINESS_NAME}} — ${label}</title>
  <meta name="description" content="{{HERO_SUBHEADLINE}} — {{PRACTITIONER_NAME}} in {{CITY}}, {{STATE}}.">
${buildStyles(niche, layout)}
</head>
<body class="niche-${niche} layout-${layout}">
  <header class="site-header">
${buildNav(pages, layout)}
  </header>

  <main id="main">
${buildHero(layout)}

${buildSections(niche, layout, foundationNum)}

${buildFeatureGrid(niche, layout)}

${buildTestimonial(layout)}

${buildCtaBand(layout)}

${buildFaq()}
  </main>

${buildFooter()}
</body>
</html>
`;
}
