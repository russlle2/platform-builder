// Main JS for Injury Law Premium Template
(function() {
  const header = document.querySelector('[data-header]');
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const nav = document.getElementById('primary-nav');

  // Sticky header shadow on scroll
  const onScroll = () => {
    const scrolled = window.scrollY > 6;
    if (header) header.style.boxShadow = scrolled ? 'var(--shadow)' : 'none';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile nav toggle
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('nav-open', isOpen);
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        document.body.classList.remove('nav-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Set current nav link based on path
  const setCurrent = () => {
    const path = location.pathname.replace(/\/index\.html$/, '/');
    document.querySelectorAll('#primary-nav a').forEach(a => {
      let href = a.getAttribute('href');
      if (!href) return;
      href = href.replace(/\/index\.html$/, '/');
      if (href === path) {
        a.setAttribute('aria-current', 'page');
      }
    });
  };
  setCurrent();

  // Year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Basic form validation
  const forms = document.querySelectorAll('form[data-validate]');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      let valid = true;
      form.querySelectorAll('[required]').forEach(input => {
        const field = input.closest('.field');
        const err = field ? field.querySelector('.error') : null;
        if (err) err.textContent = '';
        if (!input.value || (input.type === 'checkbox' && !input.checked)) {
          valid = false;
          if (err) err.textContent = 'This field is required.';
        } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
          valid = false;
          if (err) err.textContent = 'Enter a valid email address.';
        }
      });
      if (!valid) e.preventDefault();
      else {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"], .btn[type="submit"]');
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = 'Sending…';
          btn.disabled = true;
          setTimeout(() => {
            btn.textContent = 'Sent! We\'ll be in touch';
          }, 700);
        }
      }
    });
  });
})();
