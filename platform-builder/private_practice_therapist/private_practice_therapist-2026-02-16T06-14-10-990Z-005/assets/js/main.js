(function(){
  // Mobile nav toggle
  const nav = document.getElementById('mainNav');
  const btn = document.getElementById('navToggle');
  if(btn && nav){
    btn.addEventListener('click', ()=>{
      nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
  }

  // Smooth scroll for in-page anchors
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

  // Accessibility: close details on open if another opens
  const details = Array.from(document.querySelectorAll('details'));
  details.forEach(d=>d.addEventListener('toggle', ()=>{
    if(d.open){
      details.forEach(other=>{ if(other!==d) other.open=false });
    }
  }));
})();