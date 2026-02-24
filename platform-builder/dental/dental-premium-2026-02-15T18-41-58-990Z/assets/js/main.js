/* dental-premium-2026-02-15T18-41-58-990Z */
(function(){
  const $ = (s,sc)=> (sc||document).querySelector(s);
  const $$ = (s,sc)=> Array.from((sc||document).querySelectorAll(s));
  // Mobile menu
  const toggle = $('.menu-toggle');
  const nav = $('.nav');
  if(toggle && nav){
    toggle.addEventListener('click',()=>{
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('show');
    });
  }
  // Active link
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  $$('.nav a').forEach(a=>{
    const href = a.getAttribute('href') || '';
    if(href.toLowerCase() === path){
      a.setAttribute('aria-current','page');
    }
  });
  // Form validation (basic, accessible)
  function validateForm(form){
    let valid = true;
    const fields = $$('[required]', form);
    fields.forEach(f=>{
      const errEl = f.closest('.field')?.querySelector('.error');
      if(errEl) errEl.textContent = '';
      if(!f.value || (f.type==='email' && !/.+@.+\..+/.test(f.value))){
        valid = false;
        if(errEl){
          errEl.textContent = 'Please enter a valid ' + (f.getAttribute('aria-label') || f.name || 'value') + '.';
        }
      }
    });
    return valid;
  }
  $$('form.needs-validate').forEach(form=>{
    form.addEventListener('submit', (e)=>{
      if(!validateForm(form)){
        e.preventDefault();
        const firstInvalid = form.querySelector('.error:not(:empty)')?.closest('.field')?.querySelector('input,textarea,select');
        firstInvalid?.focus();
      } else {
        // Simulate success if no action defined
        if(!form.getAttribute('action') || form.getAttribute('action')==='#'){
          e.preventDefault();
          const box = form.querySelector('.form-status');
          if(box){
            box.textContent = 'Thank you! Your request has been received. Our care team will contact you shortly.';
            box.classList.remove('error');
          }
          form.reset();
        }
      }
    });
  });
  // Hours badge: show open/closed based on {{HOURS}} is not machine-readable; skip parsing.
})();
