(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // Nav toggle
  const navToggle = $('[data-nav-toggle]');
  const nav = $('#site-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Sticky header shadow on scroll
  const header = $('[data-header]');
  const onScroll = () => {
    if (!header) return;
    const scrolled = window.scrollY > 8;
    header.style.boxShadow = scrolled ? '0 4px 16px rgba(2,6,23,0.08)' : '0 1px 0 rgba(2,6,23,0.06)';
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // Year
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

  // Form validation helper
  function validateForm(form){
    let valid = true;
    const status = $('.form-status', form) || $('.form-status');
    const fields = $$('input, textarea, select', form);
    fields.forEach(f => {
      const container = f.closest('.field') || form;
      const old = container.querySelector('.error-text');
      if (old) old.remove();
      f.removeAttribute('aria-invalid');
      if (f.hasAttribute('required') && !String(f.value).trim()){
        valid = false;
        f.setAttribute('aria-invalid','true');
        const msg = document.createElement('div');
        msg.className = 'error-text';
        msg.textContent = 'This field is required';
        container.appendChild(msg);
      } else if (f.type === 'email' && f.value){
        const ok = /.+@.+\..+/.test(f.value);
        if (!ok){
          valid = false;
          f.setAttribute('aria-invalid','true');
          const msg = document.createElement('div');
          msg.className = 'error-text';
          msg.textContent = 'Enter a valid email address';
          container.appendChild(msg);
        }
      }
    });
    if (status){
      status.textContent = valid ? '' : 'Please correct the highlighted fields.';
      status.className = 'form-status' + (valid ? ' success-text' : '');
    }
    return valid;
  }

  // Persist minimal form fields to session storage
  function persist(form){
    const key = 'form:' + (form.id || 'generic');
    const data = {};
    $$('input, textarea, select', form).forEach(f => { if(f.name) data[f.name]=f.value; });
    sessionStorage.setItem(key, JSON.stringify(data));
  }
  function restore(form){
    const key = 'form:' + (form.id || 'generic');
    try{
      const data = JSON.parse(sessionStorage.getItem(key) || '{}');
      Object.entries(data).forEach(([k,v]) => { const el = form.elements[k]; if(el) el.value = v; });
    }catch(e){}
  }

  $$('form[data-validate]').forEach(form => {
    restore(form);
    form.addEventListener('input', () => persist(form));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(form)) return;
      // Simulate async submit
      const status = $('.form-status', form) || $('.form-status');
      if (status){ status.textContent = 'Sending...'; }
      setTimeout(() => {
        if (status){
          status.textContent = 'Thank you! We\'ll be in touch shortly.';
          status.classList.add('success-text');
        }
        form.reset();
        persist(form);
      }, 600);
    });
  });

  // Accessibility: close mobile menu on outside click or link click
  document.addEventListener('click', (e) => {
    if (!nav || !nav.classList.contains('open')) return;
    const within = nav.contains(e.target) || (navToggle && navToggle.contains(e.target));
    if (!within){ nav.classList.remove('open'); navToggle.setAttribute('aria-expanded','false'); }
  });

})();
