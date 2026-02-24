(function(){
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if(toggle && nav){
    toggle.addEventListener('click', ()=>{
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.style.display = expanded ? '' : 'block';
    });
  }

  // Smooth scroll for internal links
  document.addEventListener('click', function(e){
    const a = e.target.closest('a');
    if(!a) return;
    const href = a.getAttribute('href');
    if(href && href.startsWith('#')){
      e.preventDefault();
      const el = document.querySelector(href);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });

  // Primary CTA analytics placeholder
  const ctas = document.querySelectorAll('.primary-cta, .btn.large');
  ctas.forEach(cta => cta.addEventListener('click', ()=>{
    try{console.log('Primary CTA clicked');}catch(e){}
  }));

  // Accessible focus outlines for keyboard users
  function handleFirstTab(e){
    if(e.key === 'Tab') document.body.classList.add('user-is-tabbing');
  }
  window.addEventListener('keydown', handleFirstTab, {once:true});
})();
