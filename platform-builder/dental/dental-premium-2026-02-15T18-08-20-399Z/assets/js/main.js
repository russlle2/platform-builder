/* Dental Premium Template JS */
(function(){
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.menu-toggle');
  const yearEl = document.querySelector('[data-year]');

  function setYear(){ if(yearEl) yearEl.textContent = new Date().getFullYear(); }
  setYear();

  function onScroll(){
    if(!header) return;
    if(window.scrollY > 8){ header.classList.add('scrolled'); } else { header.classList.remove('scrolled'); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if(toggle && nav){
    toggle.addEventListener('click', ()=>{
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      if(open) nav.querySelector('a')?.focus();
    });
  }

  // Basic client-side form validation and success simulation
  document.querySelectorAll('form[data-enhanced]')?.forEach(form=>{
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn?.setAttribute('disabled', 'true');
      submitBtn?.classList.add('sending');
      const invalid = form.querySelector(':invalid');
      if(invalid){
        invalid.focus();
        submitBtn?.removeAttribute('disabled');
        submitBtn?.classList.remove('sending');
        return;
      }
      setTimeout(()=>{
        alert('Thank you! Your submission has been received. We will contact you shortly at the details you provided.');
        submitBtn?.removeAttribute('disabled');
        submitBtn?.classList.remove('sending');
        form.reset();
      }, 600);
    });
  });

  // Set aria-current on matching nav link (for safety if not set)
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(a=>{
    if(a.getAttribute('href') === path){ a.setAttribute('aria-current','page'); }
  });
})();
