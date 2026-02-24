(function(){
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Mobile nav toggle
  const nav = $('.nav');
  const toggle = $('.nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        const firstLink = nav.querySelector('a');
        firstLink && firstLink.focus();
      }
    });
  }

  // Header shadow on scroll
  const header = $('.site-header');
  const backToTop = $('#backToTop');
  const onScroll = () => {
    if (!header) return;
    const scrolled = window.scrollY > 8;
    header.style.boxShadow = scrolled ? '0 6px 16px rgba(14,27,42,.08)' : 'none';
    if (backToTop) backToTop.classList.toggle('show', window.scrollY > 480);
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Smooth scroll for in-page links
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id && id.length > 1) {
      const el = $(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.focus({ preventScroll: true });
      }
    }
  }));

  // Back to top
  if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Simple form validation
  const forms = $$('.js-validate');
  const showError = (field, msg) => {
    let err = field.parentElement.querySelector('.error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'error';
      field.parentElement.appendChild(err);
    }
    err.textContent = msg;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', err.id || (err.id = field.name + '-error'));
  };
  const clearError = (field) => {
    field.removeAttribute('aria-invalid');
    const err = field.parentElement.querySelector('.error');
    if (err) err.textContent = '';
  };
  const validators = {
    text: v => v.trim().length > 1,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    tel: v => /[0-9\-\+\(\)\s]{7,}/.test(v),
    select: v => v.trim() !== ''
  };
  forms.forEach(form => {
    form.setAttribute('novalidate', 'novalidate');
    form.addEventListener('submit', e => {
      let ok = true;
      $$('[data-required]', form).forEach(field => {
        clearError(field);
        const type = field.type === 'select-one' ? 'select' : (field.getAttribute('data-type') || field.type || 'text');
        const valid = validators[type] ? validators[type](field.value) : field.value.trim() !== '';
        if (!valid) {
          ok = false;
          showError(field, field.getAttribute('data-error') || 'Please complete this field.');
        }
      });
      if (!ok) e.preventDefault();
    });
  });

  // Prefill booking service from ?service=
  const url = new URL(window.location.href);
  const serviceParam = url.searchParams.get('service');
  if (serviceParam) {
    const sel = $('select[name="service"]');
    if (sel) {
      $$('option', sel).forEach(o => { if (o.value.toLowerCase() === serviceParam.toLowerCase()) sel.value = o.value; });
    }
  }

  // Financing calculator
  const amount = $('#calc-amount');
  const apr = $('#calc-apr');
  const term = $('#calc-term');
  const out = $('#calc-monthly');
  function updatePayment(){
    if (!amount || !apr || !term || !out) return;
    const P = Math.max(0, parseFloat(amount.value || '0'));
    const r = (parseFloat(apr.value || '0') / 100) / 12;
    const n = Math.max(1, parseInt(term.value || '1', 10));
    let m = 0;
    if (r === 0) {
      m = P / n;
    } else {
      m = (P * r) / (1 - Math.pow(1 + r, -n));
    }
    out.textContent = isFinite(m) ? '$' + m.toFixed(2) + ' / mo' : '—';
  }
  [amount, apr, term].forEach(el => el && el.addEventListener('input', updatePayment));
  updatePayment();
})();
