(function(){
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

  // Mobile nav toggle
  const toggle = $('.nav-toggle');
  const nav = $('#primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('open');
    });
  }

  // Back to top
  const backToTop = $('.back-to-top');
  if (backToTop) {
    const onScroll = () => {
      if (window.scrollY > 600) backToTop.classList.add('show');
      else backToTop.classList.remove('show');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Year
  $$('[data-year]').forEach(el => el.textContent = String(new Date().getFullYear()));

  // Simple form handler (demo only)
  function wireForm(id){
    const form = document.getElementById(id);
    if(!form) return;
    const success = $('[data-form-success]', form) || $('.form-success', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Minimal validation
      const invalid = $$('input[required], select[required], textarea[required]', form).filter(f => !f.value || (f.type==='checkbox' && !f.checked));
      if (invalid.length) {
        invalid[0].focus();
        invalid.forEach(f => f.setAttribute('aria-invalid', 'true'));
        return;
      }
      $$('[aria-invalid]')?.forEach(f => f.removeAttribute('aria-invalid'));
      if (success) success.hidden = false;
      form.reset();
    });
  }
  wireForm('booking-form');
  wireForm('contact-form');
})();
