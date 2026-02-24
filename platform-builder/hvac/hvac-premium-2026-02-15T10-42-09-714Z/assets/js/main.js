/* Main JS for HVAC Premium template */
(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // Year in footer
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  const toggle = $('.nav-toggle');
  const nav = $('#primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    });
  }

  // Financing calculator
  function formatUSD(num){
    if (!isFinite(num)) return '$0.00';
    return num.toLocaleString(undefined, {style:'currency', currency:'USD'});
  }
  function calcMonthly(P, apr, months){
    const r = (apr/100)/12;
    if (r === 0) return P / months;
    const m = (P * r) / (1 - Math.pow(1 + r, -months));
    return m;
  }
  const amount = $('#amount');
  const apr = $('#apr');
  const term = $('#term');
  const monthly = $('#monthly');
  function updateCalc(){
    if (!amount || !apr || !term || !monthly) return;
    const P = parseFloat(amount.value || '0');
    const A = parseFloat(apr.value || '0');
    const T = parseInt(term.value || '0', 10);
    const m = calcMonthly(P, A, T);
    monthly.textContent = formatUSD(m);
  }
  [amount, apr, term].forEach(el => el && el.addEventListener('input', updateCalc));
  updateCalc();

  // Simple form handling: validate required and create mailto draft
  function handleForm(formId, subject){
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const required = $$('[required]', form);
      let ok = true;
      required.forEach(f => {
        if (!f.value.trim()) { ok = false; f.setAttribute('aria-invalid','true'); f.style.borderColor = 'var(--danger)'; }
        else { f.removeAttribute('aria-invalid'); f.style.borderColor = ''; }
      });
      if (!ok) { alert('Please complete the required fields.'); return; }

      const data = new FormData(form);
      const lines = [];
      data.forEach((v, k) => { lines.push(`${k}: ${v}`); });
      const body = encodeURIComponent(lines.join('\n'));
      const to = '{{EMAIL}}';
      const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${body}`;
      window.location.href = mailto;
    });
  }
  handleForm('booking-form', 'New Service Request');
  handleForm('contact-form', 'Contact Form Message');

  // Accessibility: close nav on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav && nav.classList.contains('open')) {
      nav.classList.remove('open');
      toggle && toggle.setAttribute('aria-expanded', 'false');
      toggle && (toggle.textContent = 'Menu');
    }
  });
})();