/* Dental Premium Template JS */
(function(){
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

  // Mobile nav toggle
  const toggle = qs('[data-nav-toggle]');
  const nav = qs('[data-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Close mobile nav when clicking a link
  qsa('[data-nav] a').forEach(a => a.addEventListener('click', () => {
    nav?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));

  // Simple client-side form enhancement
  qsa('form[data-enhance]').forEach(form => {
    form.addEventListener('submit', (e) => {
      const required = qsa('[data-required]', form);
      let ok = true;
      required.forEach(input => {
        if (!input.value.trim()) {
          ok = false;
          input.setAttribute('aria-invalid', 'true');
          input.classList.add('shake');
          setTimeout(()=> input.classList.remove('shake'), 300);
        } else {
          input.removeAttribute('aria-invalid');
        }
      });
      if (!ok) {
        e.preventDefault();
        const alert = qs('[data-alert]', form);
        if (alert) { alert.hidden = false; alert.textContent = 'Please fill in required fields.'; }
        return;
      }
      // For static templates, prevent actual submission by default
      if (form.getAttribute('data-demo') === 'true') {
        e.preventDefault();
        const alert = qs('[data-alert]', form);
        if (alert) { alert.hidden = false; alert.classList.remove('alert-danger'); alert.classList.add('alert-success'); alert.textContent = 'Thank you! We\'ll be in touch shortly.'; }
        form.reset();
      }
    });
  });

  // Smooth scroll for in-page anchors
  qsa('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id && id.length > 1) {
        const target = qs(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
})();
