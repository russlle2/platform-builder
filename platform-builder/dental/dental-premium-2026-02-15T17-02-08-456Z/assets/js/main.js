(function(){
  const qs = (s, sc=document) => sc.querySelector(s);
  const qsa = (s, sc=document) => Array.from(sc.querySelectorAll(s));

  // Header shadow on scroll
  const header = qs('.site-header');
  const onScroll = () => {
    if (!header) return;
    const scrolled = window.scrollY > 6;
    header.classList.toggle('is-scrolled', scrolled);
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // Mobile nav toggle
  const toggle = qs('.nav__toggle');
  const menu = qs('#nav-menu');
  if (toggle && menu) {
    const close = () => { toggle.setAttribute('aria-expanded','false'); menu.classList.remove('is-open'); };
    toggle.addEventListener('click', ()=>{
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('is-open');
    });
    // Close on link click
    qsa('a', menu).forEach(a=>a.addEventListener('click', close));
    // Close on Escape
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
  }

  // Highlight current nav link
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  qsa('.nav__menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    const target = href.toLowerCase();
    if ((path === '' && target.includes('index')) || path === target) {
      a.classList.add('is-active');
    }
  });

  // Current year
  const y = new Date().getFullYear();
  qsa('#year').forEach(el => el.textContent = y);

  // Simple form validation and faux submit
  function wireForm(form){
    if(!form) return;
    const msg = qs('.form__message', form);
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const invalid = qsa('input,select,textarea', form).filter(el => !el.checkValidity());
      if(invalid.length){
        invalid[0].focus();
        if(msg){ msg.textContent = 'Please complete required fields.'; msg.style.color = '#b45309'; }
        return;
      }
      if(msg){ msg.textContent = 'Thank you! Your request has been received. We will contact you shortly.'; msg.style.color = 'var(--primary)'; }
      form.reset();
    });
  }
  wireForm(qs('#appointment-form'));
  wireForm(qs('#contact-form'));

  // Smooth scroll for internal anchors
  qsa('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href');
      if(id && id.length > 1){
        const target = qs(id);
        if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth'}); target.focus?.(); }
      }
    });
  });
})();
