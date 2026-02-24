(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // Year
  const year = new Date().getFullYear();
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(year);

  // Mobile nav toggle
  const nav = document.querySelector('[data-nav]');
  const toggle = document.querySelector('.nav-toggle');
  const header = document.querySelector('[data-header]');
  const setOpen = (open) => {
    if (!nav || !toggle) return;
    nav.setAttribute('data-open', open ? 'true' : 'false');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.getAttribute('data-open') === 'true';
      setOpen(!isOpen);
      toggle.setAttribute('aria-label', !isOpen ? 'Close menu' : 'Open menu');
    });
  }
  // Close on escape or link click
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
  $$('.site-nav a').forEach(a => a.addEventListener('click', () => setOpen(false)));

  // Header subtle shadow on scroll
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY || window.pageYOffset;
    if (!header) return;
    header.style.boxShadow = y > 4 ? '0 6px 18px rgba(15,79,87,.10)' : 'none';
    lastY = y;
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Smooth scroll for in-page links (with respects to prefers-reduced-motion)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('a[href^="#"][data-scroll], nav a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (prefersReduced) {
        target.scrollIntoView();
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      target.setAttribute('tabindex','-1');
      target.focus({ preventScroll: true });
      setTimeout(() => target.removeAttribute('tabindex'), 400);
    });
  });

  // FAQ accordion
  const faq = document.querySelector('[data-accordion]');
  if (faq) {
    faq.addEventListener('click', (e) => {
      const btn = e.target.closest('.faq-toggle');
      if (!btn) return;
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      // collapse others
      $$('.faq-toggle', faq).forEach(b => {
        const p = document.getElementById(b.getAttribute('aria-controls'));
        if (b !== btn) { b.setAttribute('aria-expanded','false'); if (p) p.hidden = true; }
      });
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      if (panel) panel.hidden = expanded;
    });
  }

  // Lead magnet form validation
  const form = document.getElementById('lead-form');
  if (form) {
    const email = form.querySelector('input[type="email"]');
    const msg = form.querySelector('.form-msg');
    const hint = form.querySelector('.form-hint');
    const ok = (text) => { if (msg){ msg.textContent = text; msg.style.color = 'var(--teal)'; } };
    const err = (text) => { if (msg){ msg.textContent = text; msg.style.color = 'var(--accent-700)'; } };
    const isValidEmail = (v) => /\S+@\S+\.[\w-]+/.test(v);

    email.addEventListener('input', () => {
      if (email.value && !isValidEmail(email.value)) {
        email.setAttribute('aria-invalid','true');
        email.style.borderColor = 'var(--accent)';
      } else {
        email.removeAttribute('aria-invalid');
        email.style.borderColor = '';
        if (msg) msg.textContent = '';
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!email.value) { err('Please enter your email.'); email.focus(); return; }
      if (!isValidEmail(email.value)) { err('That email looks a bit off—mind checking it?'); email.focus(); return; }
      // Simulate success
      ok('Check your inbox! Your guide is on the way.');
      if (hint) hint.style.display = 'none';
      form.classList.add('is-success');
      email.setAttribute('disabled','true');
      form.querySelector('button')?.setAttribute('disabled','true');
    });
  }
})();