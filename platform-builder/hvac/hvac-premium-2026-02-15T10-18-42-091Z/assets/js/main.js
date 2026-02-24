document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.style.display = expanded ? 'none' : 'block';
    });
  }

  // Set current year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Enhance tel links for desktop
  document.querySelectorAll('a[data-dial]').forEach(a => {
    a.addEventListener('click', (e) => {
      // Allow default on mobile; on desktop show copy hint
      if (!/Mobi|Android/i.test(navigator.userAgent)) {
        e.preventDefault();
        const num = a.getAttribute('href')?.replace('tel:', '') || '';
        navigator.clipboard?.writeText(num);
        toast(`Phone number copied: ${num}`);
      }
    });
  });

  // Simple form handler
  document.querySelectorAll('form[data-enhanced]')?.forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!form.checkValidity()) {
        e.preventDefault();
        form.querySelectorAll(':invalid')[0]?.focus();
        toast('Please complete required fields.', 'warning');
        return;
      }
      // Simulate success
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try { localStorage.setItem('hvac:lastSubmission', JSON.stringify(data)); } catch {}
      const alert = form.querySelector('[data-form-alert]');
      if (alert) {
        alert.className = 'alert alert-success';
        alert.textContent = 'Thanks! Your request has been received. We will contact you shortly.';
      }
      form.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Financing FAQs toggle
  document.querySelectorAll('[data-accordion] button')?.forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const panel = btn.nextElementSibling;
      if (panel) panel.hidden = expanded;
    });
  });
});

function toast(msg, type = 'info'){
  const el = document.createElement('div');
  el.setAttribute('role','status');
  el.style.position = 'fixed';
  el.style.zIndex = '9999';
  el.style.left = '50%';
  el.style.bottom = '24px';
  el.style.transform = 'translateX(-50%)';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '12px';
  el.style.border = '1px solid #d6e2ff';
  el.style.background = '#eef4ff';
  el.style.color = '#14356f';
  if (type==='warning'){ el.style.background='#fff7e6'; el.style.border='1px solid #ffe0a3'; el.style.color='#6b4700'; }
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 2400);
}
