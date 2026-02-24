(function(){
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

  // Mobile nav toggle
  const nav = $('.nav');
  const navToggle = $('#navToggle');
  if(nav && navToggle){
    navToggle.addEventListener('click', ()=>{
      const open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open? 'true' : 'false');
    });
  }

  // Current page highlighting
  const path = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a').forEach(a=>{
    const href = a.getAttribute('href');
    if((path === '' && href === 'index.html') || href === path){
      a.setAttribute('aria-current','page');
    }
  });

  // Simple accordion
  $$('.acc-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const item = btn.closest('.acc-item');
      const open = item.hasAttribute('open');
      item.toggleAttribute('open');
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });

  // Form handling: validate and show inline success without network
  function handleForm(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const required = $$('[required]', form);
      let ok = true;
      required.forEach(f=>{
        if(!f.value){ ok = false; f.setAttribute('aria-invalid','true'); f.focus(); }
      });
      const status = form.querySelector('.js-status');
      if(ok){
        if(status){
          status.className = 'status success js-status';
          status.textContent = 'Thank you! Your request has been recorded. A team member will follow up shortly. For urgent needs, please call '+ (document.querySelector('[data-phone]')?.dataset.phone || '{{PHONE}}') +'.';
        }
        form.reset();
      } else {
        if(status){
          status.className = 'status error js-status';
          status.textContent = 'Please complete all required fields.';
        }
      }
    });
  }
  $$('form[data-form="request"]').forEach(handleForm);

  // Smooth anchor focus
  $$('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(el){
        el.setAttribute('tabindex','-1');
        el.addEventListener('blur', ()=> el.removeAttribute('tabindex'), {once:true});
      }
    });
  });
})();
