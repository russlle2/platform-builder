/* Template: dental-premium-2026-02-15T16-07-17-912Z */
(function(){
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

  document.addEventListener('DOMContentLoaded', () => {
    // Mobile nav toggle
    const toggle = $('.nav-toggle');
    const wrap = $('.nav-wrap');
    if (toggle && wrap) {
      toggle.addEventListener('click', () => {
        wrap.classList.toggle('open');
        toggle.setAttribute('aria-expanded', wrap.classList.contains('open'));
      });
      // Close on escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { wrap.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
      });
    }

    // Mark current nav item by data-page attribute on body
    try {
      const page = document.body.getAttribute('data-page');
      if (page) {
        $$('.nav-menu a').forEach(a => {
          const href = (a.getAttribute('href')||'').split('?')[0].split('#')[0];
          if (href.endsWith(page)) a.setAttribute('aria-current', 'page');
        });
      }
    } catch(e){ /* noop */ }

    // Smooth scroll for internal anchors
    $$("a[href^='#']").forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length > 1) {
          const el = $(id);
          if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    // Mailto forms: convert form data into a mailto link
    function serialize(obj){
      return Object.entries(obj).map(([k,v]) => `${encodeURIComponent(k)}: ${encodeURIComponent(v)}`).join('%0D%0A');
    }

    function handleMailtoForm(form){
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const to = form.getAttribute('data-mailto') || form.getAttribute('action') || '{{EMAIL}}';
        const subject = form.getAttribute('data-subject') || `${document.title} — Website Request`;
        const data = {};
        $$("input, textarea, select", form).forEach(input => {
          if (!input.name) return;
          if ((input.type === 'checkbox' || input.type === 'radio') && !input.checked) return;
          data[input.name] = input.value;
        });
        const body = serialize(data);
        const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${body}`;
        window.location.href = href;
        const notice = $('.form-notice', form);
        if (notice) {
          notice.textContent = 'Opening your email client… If it did not open, please email {{EMAIL}}.';
          notice.classList.remove('danger');
          notice.classList.add('alert');
        }
      });
    }

    $$('.mailto-form').forEach(handleMailtoForm);

    // Simple required validation UI (client-side only)
    $$('.form [required]').forEach(input => {
      input.addEventListener('invalid', () => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, { once: true });
    });
  });
})();
